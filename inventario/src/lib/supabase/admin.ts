import { createClient } from "@supabase/supabase-js";
import { normalizeSecretEnv, normalizeSupabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente con service role — solo en servidor (Route Handlers, Server Actions).
 */
export function createAdminClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeSecretEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
