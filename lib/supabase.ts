import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Browser/client Supabase client. Use for client components.
 * When using with Auth0, you can pass the Auth0 access token to Supabase
 * if you configure Supabase to accept Auth0 JWTs (custom JWT).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side Supabase client (e.g. in API routes or Server Components).
 * Uses service role only when SUPABASE_SERVICE_ROLE_KEY is set (server-only operations).
 */
export function createServerSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}
