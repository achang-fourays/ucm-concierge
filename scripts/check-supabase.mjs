import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const requiredTables = [
  "users",
  "events",
  "attendees",
  "travel_items",
  "speakers",
  "agenda_items",
  "executive_briefs",
  "copilot_nudges",
  "person_profiles",
  "profile_enrichment_drafts",
  "profile_field_provenance",
  "audit_log",
];

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const missing = [];
for (const table of requiredTables) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    missing.push(`${table}: ${error.message}`);
  }
}

if (missing.length) {
  console.error("Supabase reachable, but required tables are missing or inaccessible:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(2);
}

console.log("Supabase connection OK. All required tables exist.");
