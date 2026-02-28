import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function updateFlight(id, patch) {
  const { error } = await supabase.from("travel_items").update(patch).eq("id", id);
  if (error) throw new Error(`${id}: ${error.message}`);
}

try {
  // UA 1341 (IAH -> SFO): 6:12 PM -> 8:45 PM on 3/2
  await updateFlight("trv_tom_arr", {
    location: "UA 1341 (IAH -> SFO)",
    start_at: "2026-03-03T00:12:00.000Z", // 6:12 PM CT
    end_at: "2026-03-03T04:45:00.000Z", // 8:45 PM PT
    notes: "Tom arrival flight on 3/2, nonstop 6:12 PM to 8:45 PM",
  });

  await updateFlight("trv_amy_arr", {
    location: "UA 1341 (IAH -> SFO)",
    start_at: "2026-03-03T00:12:00.000Z", // 6:12 PM CT
    end_at: "2026-03-03T04:45:00.000Z", // 8:45 PM PT
    notes: "Amy arrival flight on 3/2, nonstop 6:12 PM to 8:45 PM",
  });

  // UA 2091 (SFO -> ORD): 6:45 AM -> 1:06 PM on 3/4
  await updateFlight("trv_amy_ret", {
    location: "UA 2091 (SFO -> ORD)",
    start_at: "2026-03-04T14:45:00.000Z", // 6:45 AM PT
    end_at: "2026-03-04T19:06:00.000Z", // 1:06 PM CT
    notes: "Amy return flight on 3/4, nonstop 6:45 AM to 1:06 PM",
  });

  // UA 1568 (SFO -> ORD): 8:25 AM -> 2:45 PM on 3/4
  await updateFlight("trv_tom_ret", {
    location: "UA 1568 (SFO -> ORD)",
    start_at: "2026-03-04T16:25:00.000Z", // 8:25 AM PT
    end_at: "2026-03-04T20:45:00.000Z", // 2:45 PM CT
    notes: "Tom return flight on 3/4, nonstop 8:25 AM to 2:45 PM",
  });

  // DL 823: 15:55 -> 18:18 on 3/1 (times provided)
  await updateFlight("trv_andy_arr", {
    location: "DL 823",
    start_at: "2026-03-01T23:55:00.000Z", // 3:55 PM PT assumption for ordering
    end_at: "2026-03-02T02:18:00.000Z", // 6:18 PM PT assumption for ordering
    notes: "Andy arrival flight on 3/1, 15:55 to 18:18",
  });

  // AA 2614: 06:00 -> 12:24 on 3/4 (times provided)
  await updateFlight("trv_andy_ret", {
    location: "AA 2614",
    start_at: "2026-03-04T14:00:00.000Z", // 6:00 AM PT assumption for ordering
    end_at: "2026-03-04T20:24:00.000Z", // 12:24 PM PT assumption for ordering
    notes: "Andy return flight on 3/4, 06:00 to 12:24",
  });

  const { data, error } = await supabase
    .from("travel_items")
    .select("id,attendee_id,location,start_at,end_at,notes")
    .in("id", ["trv_tom_arr", "trv_tom_ret", "trv_amy_arr", "trv_amy_ret", "trv_andy_arr", "trv_andy_ret"])
    .order("attendee_id", { ascending: true })
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  console.log("Flight times updated.");
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
