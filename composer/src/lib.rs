//! Merges OSTree repository summaries for the omapak repo proxy.
//!
//! omapak's CI-signed summary supplies omapak's own refs; flathub's live
//! summary supplies the rest of the catalog — including the extension
//! refs (Locale, .Debug, .Sources) that no CI mirror can fetch, because
//! dl.flathub.org rate-limits bulk object fetching by IP. Merging at the
//! summary level needs no commit objects at all: every ref carries its
//! checksum in the document.
//!
//! Layout, from ostree's own writer: the summary is
//! `(a(s(taya{sv}))a{sv})` — refs, then global metadata. flathub keeps
//! most of its refs in the collection map (`ostree.summary.collection-map`)
//! inside that metadata; omapak's refs are plain field-0 entries.
use anyhow::{anyhow, bail, Context, Result};
use ostrya_gvariant::{from_bytes, to_bytes, Type, Value};
use std::collections::HashSet;

const SUMMARY_TY: &str = "(a(s(taya{sv}))a{sv})";
const SIG_TY: &str = "a{sv}";
const GPGSIGS_KEY: &str = "ostree.gpgsigs";

fn ty(s: &str) -> Result<Type> {
    Type::parse(s).map_err(|e| anyhow!("type {s}: {e}"))
}

/// Parse a summary into (refs, metadata).
fn parse(bytes: &[u8]) -> Result<(Vec<Value>, Value)> {
    let t = ty(SUMMARY_TY)?;
    let value = from_bytes(&t, bytes).context("parsing summary")?;
    let Value::Tuple(mut fields) = value else {
        bail!("summary is not a tuple");
    };
    let metadata = fields.pop().expect("two fields");
    let Value::Array(refs) = fields.pop().expect("two fields") else {
        bail!("summary field 0 is not an array");
    };
    Ok((refs, metadata))
}

fn ref_name(entry: &Value) -> Result<&str> {
    entry
        .as_tuple()
        .and_then(|t| t.first())
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow!("ref entry has no name"))
}

/// Metadata is an `a{sv}` dict: an array of `(key, variant)` tuples.
fn dict_entries(dict: &Value) -> Result<Vec<(String, Value)>> {
    let Some(entries) = dict.as_array() else {
        bail!("metadata is not a dict");
    };
    let mut out = Vec::with_capacity(entries.len());
    for entry in entries {
        let Some([Value::Str(k), v]) = entry.as_tuple() else {
            bail!("metadata entry is not (key, value)");
        };
        out.push((k.clone(), v.clone()));
    }
    Ok(out)
}

/// Merge omapak's summary with flathub's; omapak's refs and metadata win
/// on conflict. Refs come out byte-wise sorted, as ostree's writer emits
/// them and as clients that binary-search expect.
pub fn merge(omapak: &[u8], flathub: &[u8]) -> Result<Vec<u8>> {
    let (om_refs, om_meta) = parse(omapak).context("omapak summary")?;
    let (fl_refs, fl_meta) = parse(flathub).context("flathub summary")?;

    let om_names: HashSet<String> = om_refs
        .iter()
        .map(|r| ref_name(r).map(str::to_owned))
        .collect::<Result<_>>()?;

    let mut merged: Vec<Value> = Vec::with_capacity(fl_refs.len() + om_refs.len());
    let mut seen: HashSet<String> = HashSet::new();
    for r in fl_refs.into_iter().chain(om_refs) {
        let name = ref_name(&r)?.to_owned();
        // flathub entries an omapak ref shadows are dropped; omapak wins.
        if om_names.contains(&name) && !seen.insert(name.clone()) {
            continue;
        }
        seen.insert(name);
        merged.push(r);
    }
    // Ref names were validated above; unwrap is safe here.
    merged.sort_by(|a, b| {
        let (Ok(x), Ok(y)) = (ref_name(a), ref_name(b)) else { return std::cmp::Ordering::Equal };
        x.cmp(y)
    });

    // omapak's metadata is authoritative for its own keys (mode,
    // last-modified, its titles); flathub's keys fill the rest —
    // crucially the collection map listing its refs.
    let mut meta_entries = dict_entries(&om_meta)?;
    let have: HashSet<String> = meta_entries.iter().map(|(k, _)| k.clone()).collect();
    for (k, v) in dict_entries(&fl_meta)? {
        if !have.contains(&k) {
            meta_entries.push((k, v));
        }
    }
    let merged_meta = Value::Array(
        meta_entries
            .into_iter()
            .map(|(k, v)| Value::Tuple(vec![Value::Str(k), v]))
            .collect(),
    );

    let out = to_bytes(&ty(SUMMARY_TY)?, &Value::Tuple(vec![Value::Array(merged), merged_meta]))
        .context("serializing merged summary")?;
    Ok(out)
}

/// Wrap a raw binary OpenPGP signature (as `gpg --detach-sign --binary`
/// produces) in the `a{sv}` shape ostree reads from `summary.sig`.
pub fn summary_sig(signature: &[u8]) -> Result<Vec<u8>> {
    let dict = Value::Array(vec![Value::Tuple(vec![
        Value::Str(GPGSIGS_KEY.to_string()),
        Value::Variant(Box::new((
            ty("aay")?,
            Value::Array(vec![Value::Bytes(signature.to_vec())]),
        ))),
    ])]);
    to_bytes(&ty(SIG_TY)?, &dict).context("serializing summary.sig")
}

/// Number of refs in a summary, for sanity checks and logging.
pub fn ref_count(summary: &[u8]) -> Result<usize> {
    Ok(parse(summary)?.0.len())
}
