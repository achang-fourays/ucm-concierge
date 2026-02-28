import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const EVENT_ID = "evt_ucm_austin_2026";

async function run(label, promise) {
  const { error, data } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

try {
  await run(
    "users upsert",
    supabase.from("users").upsert([
      { id: "usr_tom", email: "tom@ucm.org", full_name: "Tom", role: "traveler" },
      { id: "usr_amy", email: "amy@ucm.org", full_name: "Amy", role: "traveler" },
      { id: "usr_andy", email: "andy@ucm.org", full_name: "Andy", role: "traveler" },
    ], { onConflict: "id" }),
  );

  await run(
    "attendees upsert",
    supabase.from("attendees").upsert([
      { id: "att_tom", event_id: EVENT_ID, user_id: "usr_tom", executive_flag: false, receive_nudges: true },
      { id: "att_amy", event_id: EVENT_ID, user_id: "usr_amy", executive_flag: false, receive_nudges: true },
      { id: "att_andy", event_id: EVENT_ID, user_id: "usr_andy", executive_flag: false, receive_nudges: true },
    ], { onConflict: "id" }),
  );

  await run(
    "delete prior flights",
    supabase
      .from("travel_items")
      .delete()
      .eq("event_id", EVENT_ID)
      .in("id", ["trv_tom_arr", "trv_tom_ret", "trv_amy_arr", "trv_amy_ret", "trv_andy_arr", "trv_andy_ret"]),
  );

  await run(
    "insert flights",
    supabase.from("travel_items").insert([
      {
        id: "trv_tom_arr",
        attendee_id: "att_tom",
        event_id: EVENT_ID,
        type: "flight",
        provider: "United Airlines",
        start_at: "2026-03-02T16:00:00.000Z",
        end_at: "2026-03-02T20:30:00.000Z",
        location: "UA 1341",
        notes: "Tom arrival flight on 3/2",
        links: { provider: "https://www.united.com/en/us/flightstatus" },
      },
      {
        id: "trv_tom_ret",
        attendee_id: "att_tom",
        event_id: EVENT_ID,
        type: "flight",
        provider: "United Airlines",
        start_at: "2026-03-04T22:00:00.000Z",
        end_at: "2026-03-05T03:00:00.000Z",
        location: "UA 1568",
        notes: "Tom return flight on 3/4",
        links: { provider: "https://www.united.com/en/us/flightstatus" },
      },
      {
        id: "trv_amy_arr",
        attendee_id: "att_amy",
        event_id: EVENT_ID,
        type: "flight",
        provider: "United Airlines",
        start_at: "2026-03-02T16:00:00.000Z",
        end_at: "2026-03-02T20:30:00.000Z",
        location: "UA 1341",
        notes: "Amy arrival flight on 3/2",
        links: { provider: "https://www.united.com/en/us/flightstatus" },
      },
      {
        id: "trv_amy_ret",
        attendee_id: "att_amy",
        event_id: EVENT_ID,
        type: "flight",
        provider: "United Airlines",
        start_at: "2026-03-04T22:15:00.000Z",
        end_at: "2026-03-05T03:15:00.000Z",
        location: "UA 2091",
        notes: "Amy return flight on 3/4",
        links: { provider: "https://www.united.com/en/us/flightstatus" },
      },
      {
        id: "trv_andy_arr",
        attendee_id: "att_andy",
        event_id: EVENT_ID,
        type: "flight",
        provider: "Delta",
        start_at: "2026-03-01T16:00:00.000Z",
        end_at: "2026-03-01T20:30:00.000Z",
        location: "DL 823",
        notes: "Andy arrival flight on 3/1",
        links: { provider: "https://www.delta.com/flight-status" },
      },
      {
        id: "trv_andy_ret",
        attendee_id: "att_andy",
        event_id: EVENT_ID,
        type: "flight",
        provider: "American Airlines",
        start_at: "2026-03-04T21:30:00.000Z",
        end_at: "2026-03-05T02:30:00.000Z",
        location: "AA 2614",
        notes: "Andy return flight on 3/4",
        links: { provider: "https://www.aa.com/travelInformation/flights/status" },
      },
    ]),
  );

  const preview = await run(
    "preview",
    supabase
      .from("travel_items")
      .select("id,attendee_id,provider,location,start_at")
      .eq("event_id", EVENT_ID)
      .in("attendee_id", ["att_tom", "att_amy", "att_andy"])
      .order("attendee_id", { ascending: true })
      .order("start_at", { ascending: true }),
  );

  console.log("Flights updated.");
  console.log(JSON.stringify(preview, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
