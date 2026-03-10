import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the service role key.
 *
 * The service role key bypasses RLS and must only be used in server-side
 * API route handlers — never in client components (Section 4.2).
 */
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
