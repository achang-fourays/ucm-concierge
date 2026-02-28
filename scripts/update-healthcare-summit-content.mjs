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

const EVENT_ID = "evt_ucm_austin_2026";
const ATTENDEE_ID = "att_tom";

async function q(promise, label) {
  const { error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

try {
  await q(
    supabase.from("events").upsert({
      id: EVENT_ID,
      title: "OpenAI Healthcare Summit",
      city: "San Francisco",
      venue: "OpenAI HQ, 1515 3rd Street, San Francisco, CA 94158",
      timezone: "America/Los_Angeles",
      start_at: "2026-03-03T20:00:00.000Z",
      end_at: "2026-03-04T05:00:00.000Z",
    }),
    "events.upsert",
  );

  await q(supabase.from("travel_items").delete().eq("event_id", EVENT_ID), "travel_items.delete");
  await q(
    supabase.from("travel_items").insert([
      {
        id: "trv_arrival_1",
        attendee_id: ATTENDEE_ID,
        event_id: EVENT_ID,
        type: "other",
        provider: "OpenAI HQ Check-in",
        start_at: "2026-03-03T19:45:00.000Z",
        end_at: "2026-03-03T20:00:00.000Z",
        location: "1515 3rd Street, San Francisco, CA 94158",
        notes: "Arrive early before registration",
        links: {
          map: "https://maps.google.com/?q=1515+3rd+Street,+San+Francisco,+CA+94158",
          uber: "https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=1515%203rd%20Street%20San%20Francisco",
        },
      },
      {
        id: "trv_dinner_1",
        attendee_id: ATTENDEE_ID,
        event_id: EVENT_ID,
        type: "car",
        provider: "Private Dinner Transfer",
        start_at: "2026-03-04T02:20:00.000Z",
        end_at: "2026-03-04T02:30:00.000Z",
        location: "Dinner venue shared with confirmed executives",
        notes: "Invite-only private dinner 6:30-9:00 PM",
        links: {},
      },
    ]),
    "travel_items.insert",
  );

  await q(supabase.from("speakers").delete().eq("event_id", EVENT_ID), "speakers.delete");
  await q(
    supabase.from("speakers").insert([
      {
        id: "spk_brad",
        event_id: EVENT_ID,
        full_name: "Brad Lightcap",
        title: "Chief Operating Officer",
        organization: "OpenAI",
        bio: "Leads OpenAI business strategy and operations, including enterprise adoption, partnerships, infrastructure, and scaling global deployment.",
      },
      {
        id: "spk_nate",
        event_id: EVENT_ID,
        full_name: "Nate Gross",
        title: "GM, Healthcare",
        organization: "OpenAI",
        bio: "Head of Health at OpenAI; previously co-founded Doximity and Rock Health; physician and healthcare technology executive.",
      },
      {
        id: "spk_ashley_alex",
        event_id: EVENT_ID,
        full_name: "Ashley Alexander",
        title: "VP Product, Healthcare",
        organization: "OpenAI",
        bio: "Leads AI-powered healthcare product development focused on patient access, outcomes, and care coordination.",
      },
      {
        id: "spk_olivier",
        event_id: EVENT_ID,
        full_name: "Olivier Godement",
        title: "Head of Product, B2B",
        organization: "OpenAI",
        bio: "Leads OpenAI's B2B product portfolio across platforms, APIs, and enterprise capabilities for AI deployment at scale.",
      },
      {
        id: "spk_hemal",
        event_id: EVENT_ID,
        full_name: "Hemal Shah",
        title: "Head of Product, ChatGPT Enterprise",
        organization: "OpenAI",
        bio: "Leads product strategy for ChatGPT Enterprise with focus on secure, reliable, and scalable business deployment.",
      },
      {
        id: "spk_ashley_k",
        event_id: EVENT_ID,
        full_name: "Ashley Kramer",
        title: "VP Enterprise",
        organization: "OpenAI",
        bio: "Leads enterprise go-to-market for responsible AI adoption at scale.",
      },
      {
        id: "spk_joy",
        event_id: EVENT_ID,
        full_name: "Joy Jiao",
        title: "Research Lead",
        organization: "OpenAI",
        bio: "Explores frontier AI research applications in healthcare and clinical education.",
      },
      {
        id: "spk_glory",
        event_id: EVENT_ID,
        full_name: "Glory Jain",
        title: "AI Deployment Engineer",
        organization: "OpenAI",
        bio: "Works with institutions deploying AI in research and clinical education settings.",
      },
      {
        id: "spk_angel",
        event_id: EVENT_ID,
        full_name: "Angel Brodin",
        title: "AI Success Engineer",
        organization: "OpenAI",
        bio: "Supports health systems scaling AI from pilot programs to production outcomes.",
      },
      {
        id: "spk_rob",
        event_id: EVENT_ID,
        full_name: "Rob Pulford",
        title: "AI Deployment Manager",
        organization: "OpenAI",
        bio: "Guides enterprise healthcare AI rollouts with focus on adoption and measurable impact.",
      },
    ]),
    "speakers.insert",
  );

  await q(supabase.from("agenda_items").delete().eq("event_id", EVENT_ID), "agenda_items.delete");
  await q(
    supabase.from("agenda_items").insert([
      {
        id: "ag_1",
        event_id: EVENT_ID,
        title: "Registration & Lunch",
        location: "OpenAI HQ",
        start_at: "2026-03-03T20:00:00.000Z",
        end_at: "2026-03-03T21:15:00.000Z",
        description: "Invite-only check-in and networking lunch.",
        speaker_ids: [],
      },
      {
        id: "ag_2",
        event_id: EVENT_ID,
        title: "Private 1:1 with Nate Gross",
        location: "Private meeting room",
        start_at: "2026-03-03T20:05:00.000Z",
        end_at: "2026-03-03T20:35:00.000Z",
        description: "Executive priorities conversation with OpenAI Head of Healthcare.",
        speaker_ids: ["spk_nate"],
      },
      {
        id: "ag_3",
        event_id: EVENT_ID,
        title: "Keynote: Frontier AI in Healthcare",
        location: "Main stage",
        start_at: "2026-03-03T21:15:00.000Z",
        end_at: "2026-03-03T22:30:00.000Z",
        description: "OpenAI leaders share the latest platform advances and healthcare strategy outlook.",
        speaker_ids: ["spk_brad", "spk_nate", "spk_olivier", "spk_hemal", "spk_ashley_k"],
      },
      {
        id: "ag_4",
        event_id: EVENT_ID,
        title: "Break",
        location: "Common area",
        start_at: "2026-03-03T22:30:00.000Z",
        end_at: "2026-03-03T23:00:00.000Z",
        description: "Refreshment break.",
        speaker_ids: [],
      },
      {
        id: "ag_5",
        event_id: EVENT_ID,
        title: "Breakout: Experience",
        location: "Breakout Room A",
        start_at: "2026-03-03T23:00:00.000Z",
        end_at: "2026-03-04T00:00:00.000Z",
        description: "Patient access, navigation, and care coordination with AI. 25-minute lightning talk + open Q&A.",
        speaker_ids: ["spk_ashley_alex"],
      },
      {
        id: "ag_6",
        event_id: EVENT_ID,
        title: "Breakout: Research",
        location: "Breakout Room B",
        start_at: "2026-03-03T23:00:00.000Z",
        end_at: "2026-03-04T00:00:00.000Z",
        description: "How AI accelerates research and clinical education across academic medical centers.",
        speaker_ids: ["spk_joy", "spk_glory"],
      },
      {
        id: "ag_7",
        event_id: EVENT_ID,
        title: "Breakout: Scale",
        location: "Breakout Room C",
        start_at: "2026-03-03T23:00:00.000Z",
        end_at: "2026-03-04T00:00:00.000Z",
        description: "Moving from pilots to production and driving measurable enterprise adoption.",
        speaker_ids: ["spk_angel", "spk_rob"],
      },
      {
        id: "ag_8",
        event_id: EVENT_ID,
        title: "Break",
        location: "Common area",
        start_at: "2026-03-04T00:00:00.000Z",
        end_at: "2026-03-04T00:30:00.000Z",
        description: "Transition break.",
        speaker_ids: [],
      },
      {
        id: "ag_9",
        event_id: EVENT_ID,
        title: "Customer Ignite Talks (UCSF & AdventHealth)",
        location: "Main stage",
        start_at: "2026-03-04T00:30:00.000Z",
        end_at: "2026-03-04T01:00:00.000Z",
        description: "Real-world deployment stories from leading institutions.",
        speaker_ids: [],
      },
      {
        id: "ag_10",
        event_id: EVENT_ID,
        title: "Executive Q&A",
        location: "Main stage",
        start_at: "2026-03-04T01:00:00.000Z",
        end_at: "2026-03-04T01:30:00.000Z",
        description: "Live discussion with Brad Lightcap and Nate Gross on frontier models and healthcare strategy.",
        speaker_ids: ["spk_brad", "spk_nate"],
      },
      {
        id: "ag_11",
        event_id: EVENT_ID,
        title: "Reception",
        location: "OpenAI HQ",
        start_at: "2026-03-04T01:30:00.000Z",
        end_at: "2026-03-04T02:30:00.000Z",
        description: "Networking reception with OpenAI leaders and healthcare executives.",
        speaker_ids: [],
      },
      {
        id: "ag_12",
        event_id: EVENT_ID,
        title: "Private Leadership Dinner",
        location: "Private dining venue",
        start_at: "2026-03-04T02:30:00.000Z",
        end_at: "2026-03-04T05:00:00.000Z",
        description: "Invite-only dinner with OpenAI leadership and a small group of C-suite executives.",
        speaker_ids: ["spk_brad", "spk_nate"],
      },
    ]),
    "agenda_items.insert",
  );

  await q(
    supabase.from("executive_briefs").upsert({
      id: "brf_1",
      event_id: EVENT_ID,
      version: 3,
      status: "approved",
      summary:
        "Executive summit focused on how health systems are moving AI from pilots into enterprise-scale deployment across care delivery, operations, research, and workforce enablement.",
      speaker_synopsis: [
        "Brad Lightcap will discuss operating strategy for frontier model deployment in healthcare.",
        "Nate Gross will frame healthcare priorities and partnership opportunities with OpenAI.",
        "Ashley Alexander will cover patient-facing AI experience and care coordination trends.",
      ],
      meeting_focus:
        "Identify near-term enterprise opportunities, risk controls for safe scale-up, and partnership pathways aligned with UCM healthcare strategy.",
      watchouts: [
        "Press for measurable outcomes and governance guardrails, not just pilot enthusiasm.",
        "Clarify data security, compliance boundaries, and operational accountability before expansion.",
      ],
      suggested_questions: [
        "What capabilities are most ready for enterprise-wide deployment in the next 12 months?",
        "What governance model best balances innovation velocity and clinical safety?",
        "How should UCM structure phased rollout metrics from pilot to system-wide adoption?",
      ],
      generated_at: "2026-03-03T18:00:00.000Z",
      approved_at: "2026-03-03T18:15:00.000Z",
      approved_by: "usr_admin",
    }),
    "executive_briefs.upsert",
  );

  await q(supabase.from("copilot_nudges").delete().eq("event_id", EVENT_ID), "copilot_nudges.delete");
  await q(
    supabase.from("copilot_nudges").insert([
      {
        id: "ndg_1",
        event_id: EVENT_ID,
        attendee_id: ATTENDEE_ID,
        title: "Private 1:1 starts soon",
        body: "Your 1:1 with Nate Gross starts at 12:05 PM. Please head to the private meeting room now.",
        source_rule: "private_1_1_buffer",
        scheduled_at: "2026-03-03T20:00:00.000Z",
        status: "approved",
        confidence: "high",
        requires_admin_approval: true,
      },
      {
        id: "ndg_2",
        event_id: EVENT_ID,
        attendee_id: ATTENDEE_ID,
        title: "Executive Q&A prep",
        body: "Executive Q&A with Brad Lightcap and Nate Gross begins at 5:00 PM. Review your top questions now.",
        source_rule: "qa_prep",
        scheduled_at: "2026-03-04T00:50:00.000Z",
        status: "approved",
        confidence: "high",
        requires_admin_approval: true,
      },
    ]),
    "copilot_nudges.insert",
  );

  await q(
    supabase.from("person_profiles").upsert({
      id: "prf_ana",
      event_id: EVENT_ID,
      person_type: "speaker",
      full_name: "Brad Lightcap",
      organization: "OpenAI",
      role_title: "Chief Operating Officer",
      highlights: [
        "Leads OpenAI business strategy and operations",
        "Oversees enterprise adoption and global deployment",
      ],
      source_approved: true,
      updated_at: new Date().toISOString(),
    }),
    "person_profiles.upsert",
  );

  await q(
    supabase.from("profile_enrichment_drafts").upsert({
      id: "enr_ana_1",
      event_id: EVENT_ID,
      person_id: "prf_ana",
      provider: "LinkedIn Marketing Developer Platform",
      match_confidence: 0.93,
      status: "approved",
      conflict_flags: [],
      generated_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: "usr_admin",
    }),
    "profile_enrichment_drafts.upsert",
  );

  await q(supabase.from("profile_field_provenance").delete().eq("draft_id", "enr_ana_1"), "profile_field_provenance.delete");
  await q(
    supabase.from("profile_field_provenance").insert({
      id: "pfp_1",
      draft_id: "enr_ana_1",
      field_name: "roleTitle",
      field_value: "Chief Operating Officer",
      source_name: "LinkedIn API",
      source_url: "https://www.linkedin.com",
      retrieved_at: new Date().toISOString(),
    }),
    "profile_field_provenance.insert",
  );

  console.log("Healthcare Summit content update complete.");
} catch (error) {
  console.error("Update failed:", error.message);
  process.exit(1);
}
