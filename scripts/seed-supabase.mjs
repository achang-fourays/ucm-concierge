import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function mustUpsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

try {
  await mustUpsert("users", [
    { id: "usr_admin", email: "morgan@ucm.org", full_name: "Morgan Lee", role: "admin" },
    { id: "usr_assistant", email: "taylor@ucm.org", full_name: "Taylor Brooks", role: "assistant" },
    { id: "usr_tom", email: "Thomas.Jackiewicz@uchicagomedicine.org", full_name: "Tom", role: "traveler" },
  ]);

  await mustUpsert("events", [
    {
      id: "evt_ucm_austin_2026",
      title: "UCM Strategic Partner Summit",
      city: "Austin",
      venue: "Austin Convention Center, Hall C",
      timezone: "America/Chicago",
      start_at: "2026-03-12T14:00:00.000Z",
      end_at: "2026-03-13T22:30:00.000Z",
    },
  ]);

  await mustUpsert("attendees", [
    {
      id: "att_tom",
      event_id: "evt_ucm_austin_2026",
      user_id: "usr_tom",
      executive_flag: true,
      receive_nudges: true,
    },
  ]);

  await mustUpsert("travel_items", [
    {
      id: "trv_flight_1",
      attendee_id: "att_tom",
      event_id: "evt_ucm_austin_2026",
      type: "flight",
      provider: "Delta",
      start_at: "2026-03-12T08:40:00.000Z",
      end_at: "2026-03-12T11:25:00.000Z",
      confirmation_code: "UCM42K",
      location: "JFK -> AUS",
      notes: "Seat 2A",
      links: {
        provider: "https://www.delta.com/flight-status",
        map: "https://maps.google.com/?q=Austin-Bergstrom+International+Airport",
        uber: "https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=Austin%20Convention%20Center",
      },
    },
    {
      id: "trv_hotel_1",
      attendee_id: "att_tom",
      event_id: "evt_ucm_austin_2026",
      type: "hotel",
      provider: "Fairmont Austin",
      start_at: "2026-03-12T16:00:00.000Z",
      end_at: "2026-03-14T16:00:00.000Z",
      confirmation_code: "FMT-99813",
      location: "101 Red River St, Austin, TX",
      links: {
        provider: "https://www.fairmont.com/austin/",
        map: "https://maps.google.com/?q=Fairmont+Austin",
      },
    },
  ]);

  await mustUpsert("speakers", [
    {
      id: "spk_ana",
      event_id: "evt_ucm_austin_2026",
      full_name: "Ana Ramirez",
      title: "VP Partnerships",
      organization: "CivicGrid",
      bio: "Leads enterprise partnerships and has scaled multi-city digital infrastructure initiatives.",
    },
    {
      id: "spk_jon",
      event_id: "evt_ucm_austin_2026",
      full_name: "Jon Patel",
      title: "Chief Innovation Officer",
      organization: "TransitWorks",
      bio: "Specializes in AI-enabled transit systems and strategic public-private collaboration.",
    },
  ]);

  await mustUpsert("agenda_items", [
    {
      id: "ag_1",
      event_id: "evt_ucm_austin_2026",
      title: "Executive Welcome and Strategic Priorities",
      location: "Hall C Main Stage",
      start_at: "2026-03-12T15:00:00.000Z",
      end_at: "2026-03-12T16:00:00.000Z",
      description: "Align on UCM priorities and define expected outcomes for partner discussions.",
      speaker_ids: ["spk_ana"],
    },
    {
      id: "ag_2",
      event_id: "evt_ucm_austin_2026",
      title: "Innovation Roundtable",
      location: "Room 403",
      start_at: "2026-03-12T18:00:00.000Z",
      end_at: "2026-03-12T19:00:00.000Z",
      description: "Discussion on operational risks, upcoming policy shifts, and partnership asks.",
      speaker_ids: ["spk_jon"],
    },
  ]);

  await mustUpsert("executive_briefs", [
    {
      id: "brf_1",
      event_id: "evt_ucm_austin_2026",
      version: 2,
      status: "approved",
      summary:
        "UCM should secure an implementation pilot with CivicGrid while confirming TransitWorks integration milestones and governance commitments.",
      speaker_synopsis: [
        "Ana Ramirez is focused on rapid pilot execution and expects clear budget ownership.",
        "Jon Patel wants alignment on integration risk-sharing and phased rollouts.",
      ],
      meeting_focus:
        "Lock terms for a 90-day pilot, agree KPI definitions, and establish a joint executive steering cadence.",
      watchouts: [
        "Avoid agreeing to broad data-sharing without legal constraints.",
        "Press for concrete delivery dates tied to measurable milestones.",
      ],
      suggested_questions: [
        "What operating constraints could delay the pilot in quarter one?",
        "Which KPI should determine go/no-go at day 90?",
        "What governance structure prevents scope creep after launch?",
      ],
      generated_at: "2026-03-12T12:30:00.000Z",
      approved_at: "2026-03-12T13:10:00.000Z",
      approved_by: "usr_admin",
    },
  ]);

  await mustUpsert("copilot_nudges", [
    {
      id: "ndg_1",
      event_id: "evt_ucm_austin_2026",
      attendee_id: "att_tom",
      title: "Head to venue",
      body: "Leave in 20 minutes to arrive 10 minutes early for executive welcome.",
      source_rule: "session_start_buffer",
      scheduled_at: "2026-03-12T14:35:00.000Z",
      status: "approved",
      confidence: "high",
      requires_admin_approval: true,
    },
  ]);

  await mustUpsert("person_profiles", [
    {
      id: "prf_ana",
      event_id: "evt_ucm_austin_2026",
      person_type: "speaker",
      full_name: "Ana Ramirez",
      organization: "CivicGrid",
      role_title: "VP Partnerships",
      highlights: ["Scaled three city rollouts", "Led enterprise procurement partnerships"],
      source_approved: true,
      updated_at: "2026-03-11T16:00:00.000Z",
    },
  ]);

  await mustUpsert("profile_enrichment_drafts", [
    {
      id: "enr_ana_1",
      event_id: "evt_ucm_austin_2026",
      person_id: "prf_ana",
      provider: "LinkedIn Marketing Developer Platform",
      match_confidence: 0.93,
      status: "approved",
      conflict_flags: [],
      generated_at: "2026-03-11T14:01:00.000Z",
      approved_at: "2026-03-11T15:00:00.000Z",
      approved_by: "usr_admin",
    },
  ]);

  await mustUpsert("profile_field_provenance", [
    {
      id: "pfp_1",
      draft_id: "enr_ana_1",
      field_name: "roleTitle",
      field_value: "VP Partnerships",
      source_name: "LinkedIn API",
      source_url: "https://www.linkedin.com",
      retrieved_at: "2026-03-11T14:00:00.000Z",
    },
  ]);

  console.log("Seed complete: Supabase now has starter concierge data.");
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}
