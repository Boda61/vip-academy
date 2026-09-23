import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates and returns a server-only Supabase client initialized with the SUPABASE_SERVICE_ROLE_KEY.
 * NEVER import or execute this on the browser/client side.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined in environment variables.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not defined in .env.local. The server-side display endpoint requires the service_role key to generate QR tokens."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
