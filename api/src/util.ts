/** sqlite datetime('now') → ISO 8601 UTC. */
export function iso(sqlite: string): string {
  return `${sqlite.replace(" ", "T")}Z`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** Integer from a query param, with default + clamp. */
export function intParam(v: string | undefined, dflt: number, lo: number, hi: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? clamp(n, lo, hi) : dflt;
}

export function base64url(input: string | ArrayBuffer | Uint8Array): string {
  const b =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);
  let s = "";
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function sha256hex(input: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(input))
    .then((d) => [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""));
}

/** Constant-time string compare (JWT signatures). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!;
  return diff === 0;
}
