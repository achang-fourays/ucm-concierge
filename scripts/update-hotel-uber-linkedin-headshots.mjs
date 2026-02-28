import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const EVENT_ID = "evt_ucm_austin_2026";
const ATTENDEE_ID = "att_tom";

async function run(label, fn) {
  const { error, data } = await fn();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const office = "1515 3rd Street, San Francisco, CA 94158";
const hotel = "JW Marriott San Francisco Union Square, 515 Mason Street, San Francisco, California, USA, 94102";
const airport = "San Francisco International Airport, San Francisco, CA 94128";

const uber = (address) =>
  `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}`;

const map = (address) => `https://maps.google.com/?q=${encodeURIComponent(address)}`;

const speakers = [
  ["spk_brad", "Brad Lightcap"],
  ["spk_nate", "Nate Gross"],
  ["spk_ashley_alex", "Ashley Alexander"],
  ["spk_olivier", "Olivier Godement"],
  ["spk_hemal", "Hemal Shah"],
  ["spk_ashley_k", "Ashley Kramer"],
  ["spk_joy", "Joy Jiao"],
  ["spk_glory", "Glory Jain"],
  ["spk_angel", "Angel Brodin"],
  ["spk_rob", "Rob Pulford"],
];

try {
  await run("travel delete", () => supabase.from("travel_items").delete().eq("event_id", EVENT_ID));

  await run("travel insert", () =>
    supabase.from("travel_items").insert([
      {
        id: "trv_hotel_1",
        attendee_id: ATTENDEE_ID,
        event_id: EVENT_ID,
        type: "hotel",
        provider: "JW Marriott San Francisco Union Square",
        start_at: "2026-03-03T18:00:00.000Z",
        end_at: "2026-03-04T19:00:00.000Z",
        location: hotel,
        notes: "Primary hotel for the summit",
        links: {
          map: map(hotel),
          uber: uber(hotel),
          provider: "https://www.marriott.com/en-us/hotels/sfojw-jw-marriott-san-francisco-union-square/overview/",
        },
      },
      {
        id: "trv_airport_1",
        attendee_id: ATTENDEE_ID,
        event_id: EVENT_ID,
        type: "car",
        provider: "SFO Airport Transfer",
        start_at: "2026-03-03T18:45:00.000Z",
        end_at: "2026-03-03T19:30:00.000Z",
        location: airport,
        notes: "Airport transfer",
        links: {
          map: map(airport),
          uber: uber(airport),
        },
      },
      {
        id: "trv_office_1",
        attendee_id: ATTENDEE_ID,
        event_id: EVENT_ID,
        type: "other",
        provider: "OpenAI HQ",
        start_at: "2026-03-03T19:45:00.000Z",
        end_at: "2026-03-03T20:00:00.000Z",
        location: office,
        notes: "Summit venue",
        links: {
          map: map(office),
          uber: uber(office),
        },
      },
    ]),
  );

  for (const [id, name] of speakers) {
    await run(`speaker ${id} update`, () =>
      supabase
        .from("speakers")
        .update({ headshot_url: `https://i.pravatar.cc/300?u=${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}` })
        .eq("event_id", EVENT_ID)
        .eq("id", id),
    );
  }

  const preview = await run("speaker preview", () =>
    supabase.from("speakers").select("id,full_name,headshot_url").eq("event_id", EVENT_ID).order("full_name", { ascending: true }),
  );

  console.log("Update complete.");
  console.log(JSON.stringify(preview.slice(0, 5), null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
