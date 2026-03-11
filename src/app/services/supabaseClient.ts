import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabaseDatabase.types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_ID_BUCKET = import.meta.env.VITE_SUPABASE_ID_BUCKET as string | undefined;

let client: ReturnType<typeof createClient<Database>> | null = null;

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabaseIdBucket = SUPABASE_ID_BUCKET?.trim() || "resident-ids";

export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return client;
}

export const supabase = hasSupabaseConfig ? getSupabaseClient() : null;
