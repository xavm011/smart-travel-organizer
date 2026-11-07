import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloudEnabled = Boolean(url && key);
export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!)
  : null;
