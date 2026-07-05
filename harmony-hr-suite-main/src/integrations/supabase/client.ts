// Supabase browser client.
// Uses the PUBLIC publishable key — safe to ship to the browser because Row
// Level Security (RLS) policies in the database enforce actual access rules.
// Never put the service role key here. Session is persisted in localStorage
// so the user stays signed in across reloads.
import { createClient } from "@supabase/supabase-js";

// Public keys — safe to ship to the browser.
const SUPABASE_URL = "https://ctzzlvnjtrtyldggsgqg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GQfTltG3WyM7u11lZZFISw_F_uGw-aP";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;

export type AppRole = "owner" | "hr_staff" | "manager" | "employee" | "cashier";
