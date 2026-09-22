import type { Catalog, FlathubIndex } from "./types";

/**
 * Catalog data lives in the omapak-repo R2 bucket (pushed by CI), the same
 * objects repo.omapak.org serves. Reads go through the Cache API with a short
 * TTL so /v1/apps stays cheap; reviews always come live from D1.
 */

const DATA_TTL_SECONDS = 300;

async function readCached<T>(env: { REPO: R2Bucket }, key: string): Promise<T | null> {
  const cache = caches.default;
  const cacheKey = new Request(`https://data.omapak.internal/${key}`);
  const hit = await cache.match(cacheKey);
  if (hit) return (await hit.json()) as T;

  const obj = await env.REPO.get(key);
  if (!obj) return null;
  const text = await obj.text();
  // Best-effort warm; a failed put must not fail the request.
  await cache.put(cacheKey, new Response(text, { headers: { "cache-control": `s-maxage=${DATA_TTL_SECONDS}` } })).catch(() => {});
  return JSON.parse(text) as T;
}

export function readCatalog(env: { REPO: R2Bucket }): Promise<Catalog | null> {
  return readCached<Catalog>(env, "data/catalog.json");
}

export function readFlathubIndex(env: { REPO: R2Bucket }): Promise<FlathubIndex | null> {
  return readCached<FlathubIndex>(env, "data/flathub.json");
}
