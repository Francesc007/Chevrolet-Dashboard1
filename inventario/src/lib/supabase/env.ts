/**
 * Limpia valores copiados desde Supabase / .env (BOM, espacios, comillas).
 * Evita "Invalid API key" / "JWS Protected Header is invalid" por pegado sucio.
 */
export function normalizeSecretEnv(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let v = raw.replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  const v = normalizeSecretEnv(raw);
  if (!v) return undefined;
  return v.replace(/\/+$/, "");
}
