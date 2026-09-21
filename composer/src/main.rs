//! composer-merge: merge omapak's summary with flathub's, optionally
//! signing the result the way ostree's summary.sig expects.
//!
//! Usage:
//!   composer-merge --omapak S --flathub F --out O [--gpg-key KEYID --sig-out SIG]
use anyhow::{bail, Context, Result};
use std::path::PathBuf;
use std::process::Command;

fn main() -> Result<()> {
    let mut omapak: Option<PathBuf> = None;
    let mut flathub: Option<PathBuf> = None;
    let mut out: Option<PathBuf> = None;
    let mut gpg_key: Option<String> = None;
    let mut sig_out: Option<PathBuf> = None;

    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        let mut val = || args.next().context(format!("{a} needs a value"));
        match a.as_str() {
            "--omapak" => omapak = Some(val()?.into()),
            "--flathub" => flathub = Some(val()?.into()),
            "--out" => out = Some(val()?.into()),
            "--gpg-key" => gpg_key = Some(val()?),
            "--sig-out" => sig_out = Some(val()?.into()),
            other => bail!("unknown argument {other}"),
        }
    }
    let (omapak, flathub, out) = (
        omapak.context("--omapak is required")?,
        flathub.context("--flathub is required")?,
        out.context("--out is required")?,
    );

    let omapak_bytes = std::fs::read(&omapak).context("reading omapak summary")?;
    let flathub_bytes = std::fs::read(&flathub).context("reading flathub summary")?;
    println!(
        "input: omapak {} refs, flathub {} refs",
        omapak_composer::ref_count(&omapak_bytes)?,
        omapak_composer::ref_count(&flathub_bytes)?
    );

    let merged = omapak_composer::merge(&omapak_bytes, &flathub_bytes)?;
    std::fs::write(&out, &merged).context("writing merged summary")?;
    println!(
        "merged: {} refs, {} bytes -> {}",
        omapak_composer::ref_count(&merged)?,
        merged.len(),
        out.display()
    );

    if let (Some(key), Some(sig_out)) = (gpg_key.clone(), sig_out.clone()) {
        // ostree stores the raw binary OpenPGP packet of a detached
        // signature over the summary bytes; gpg produces exactly that.
        let tmp = sig_out.with_extension("raw.sig");
        let status = Command::new("gpg")
            .args(["--batch", "--yes", "--detach-sign", "--no-armor"])
            .arg("--local-user").arg(&key)
            .arg("--output").arg(&tmp)
            .arg(&out)
            .status()
            .context("running gpg")?;
        if !status.success() {
            bail!("gpg signing failed: {status}");
        }
        let raw = std::fs::read(&tmp).context("reading raw signature")?;
        let sig = omapak_composer::summary_sig(&raw)?;
        std::fs::write(&sig_out, &sig).context("writing summary.sig")?;
        let _ = std::fs::remove_file(&tmp);
        println!("signed: {} -> {} ({} bytes)", key, sig_out.display(), sig.len());
    } else if gpg_key.is_some() || sig_out.is_some() {
        bail!("--gpg-key and --sig-out must be given together");
    }
    Ok(())
}
