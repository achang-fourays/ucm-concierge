import { handleError, ok } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const missing: string[] = [];

    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        missing.push(`${table}: ${error.message}`);
      }
    }

    if (missing.length > 0) {
      return ok({
        connected: false,
        message: "Supabase is reachable, but schema is not fully ready. Run supabase/schema.sql in SQL Editor.",
        missing,
      });
    }

    return ok({ connected: true, message: "Supabase is connected and all required tables are available." });
  } catch (error) {
    return handleError(error);
  }
}
