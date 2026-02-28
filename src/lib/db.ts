import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AgendaItem, Attendee, CopilotNudge, EnrichmentDraft, Event, ExecutiveBrief, PersonProfile, Speaker, TravelItem, User } from "@/lib/types";

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function requireData<T>(data: T | null, label: string): T {
  if (!data) {
    throw new Error(`${label}: expected row but received none`);
  }
  return data;
}

function mapUser(row: { id: string; email: string; full_name: string; role: User["role"] }): User {
  return { id: row.id, email: row.email, name: row.full_name, role: row.role };
}

function mapEvent(row: { id: string; title: string; city: string; venue: string; timezone: string; start_at: string; end_at: string }): Event {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    venue: row.venue,
    timezone: row.timezone,
    startAt: row.start_at,
    endAt: row.end_at,
  };
}

function mapAttendee(row: { id: string; event_id: string; user_id: string; executive_flag: boolean; receive_nudges: boolean }): Attendee {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    executiveFlag: row.executive_flag,
    preferences: { receiveNudges: row.receive_nudges },
  };
}

function mapTravel(row: {
  id: string;
  attendee_id: string;
  event_id: string;
  type: TravelItem["type"];
  provider: string;
  start_at: string;
  end_at: string | null;
  confirmation_code: string | null;
  location: string | null;
  notes: string | null;
  links: TravelItem["links"];
}): TravelItem {
  return {
    id: row.id,
    attendeeId: row.attendee_id,
    eventId: row.event_id,
    type: row.type,
    provider: row.provider,
    startAt: row.start_at,
    endAt: row.end_at ?? undefined,
    confirmationCode: row.confirmation_code ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    links: row.links || {},
  };
}

function mapAgenda(row: {
  id: string;
  event_id: string;
  title: string;
  location: string;
  start_at: string;
  end_at: string;
  description: string | null;
  speaker_ids: string[] | null;
}): AgendaItem {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    description: row.description ?? "",
    speakerIds: row.speaker_ids ?? [],
  };
}

const speakerLinkedinById: Record<string, string> = {
  spk_brad: "https://www.linkedin.com/in/bradlightcap/",
  spk_nate: "https://www.linkedin.com/in/nategross/",
  spk_ashley_alex: "https://www.linkedin.com/in/ashleyyuki/",
  spk_olivier: "https://www.linkedin.com/in/oliviergodement/",
  spk_hemal: "https://www.linkedin.com/in/hemaljshah/",
  spk_ashley_k: "https://www.linkedin.com/in/ashleyekramer/",
  spk_joy: "https://www.linkedin.com/in/yunxin-jiao/",
  spk_glory: "https://www.linkedin.com/in/gloryjain/",
  spk_angel: "https://www.linkedin.com/in/angelbrodin/",
  spk_rob: "https://www.linkedin.com/in/robertpulford/",
};

function getLinkedinUrl(speakerId: string, name: string): string {
  return speakerLinkedinById[speakerId] ?? ("https://www.linkedin.com/search/results/all/?keywords=" + encodeURIComponent(name + " OpenAI"));
}

function mapSpeaker(row: {
  id: string;
  event_id: string;
  full_name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  headshot_url: string | null;
}): Speaker {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.full_name,
    title: row.title ?? "",
    org: row.organization ?? "",
    bio: row.bio ?? "",
    headshotUrl: row.headshot_url ?? undefined,
    linkedinUrl: getLinkedinUrl(row.id, row.full_name),
  };
}

function mapBrief(row: {
  event_id: string;
  version: number;
  summary: string;
  speaker_synopsis: string[] | null;
  meeting_focus: string | null;
  watchouts: string[] | null;
  suggested_questions: string[] | null;
  generated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  status: ExecutiveBrief["status"];
}): ExecutiveBrief {
  return {
    eventId: row.event_id,
    version: row.version,
    summary: row.summary,
    speakerSynopsis: row.speaker_synopsis ?? [],
    meetingFocus: row.meeting_focus ?? "",
    watchouts: row.watchouts ?? [],
    suggestedQuestions: row.suggested_questions ?? [],
    generatedAt: row.generated_at,
    approvedAt: row.approved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    status: row.status,
  };
}

function mapNudge(row: {
  id: string;
  event_id: string;
  attendee_id: string;
  title: string;
  body: string;
  scheduled_at: string;
  source_rule: string;
  status: CopilotNudge["status"];
  confidence: CopilotNudge["confidence"];
  requires_admin_approval: boolean;
}): CopilotNudge {
  return {
    id: row.id,
    eventId: row.event_id,
    attendeeId: row.attendee_id,
    title: row.title,
    body: row.body,
    scheduledAt: row.scheduled_at,
    sourceRule: row.source_rule,
    status: row.status,
    confidence: row.confidence,
    requiresAdminApproval: row.requires_admin_approval,
  };
}

function mapProfile(row: {
  id: string;
  event_id: string;
  person_type: "speaker" | "invitee";
  full_name: string;
  email: string | null;
  organization: string | null;
  role_title: string | null;
  highlights: string[] | null;
  source_approved: boolean;
  updated_at: string;
}): PersonProfile {
  return {
    id: row.id,
    eventId: row.event_id,
    personType: row.person_type,
    name: row.full_name,
    email: row.email ?? undefined,
    organization: row.organization ?? undefined,
    roleTitle: row.role_title ?? undefined,
    highlights: row.highlights ?? [],
    sourceApproved: row.source_approved,
    updatedAt: row.updated_at,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("id,email,full_name,role").eq("id", userId).maybeSingle();
  throwIfError(error);
  return data ? mapUser(data) : null;
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,city,venue,timezone,start_at,end_at")
    .eq("id", eventId)
    .maybeSingle();
  throwIfError(error);
  return data ? mapEvent(data) : null;
}

export async function createEvent(payload: {
  title: string;
  city: string;
  venue: string;
  timezone: string;
  startAt: string;
  endAt: string;
}): Promise<Event> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .insert({
      id: `evt_${randomUUID()}`,
      title: payload.title,
      city: payload.city,
      venue: payload.venue,
      timezone: payload.timezone,
      start_at: payload.startAt,
      end_at: payload.endAt,
    })
    .select("id,title,city,venue,timezone,start_at,end_at")
    .single();
  throwIfError(error);
  return mapEvent(requireData(data, "events.insert"));
}

export async function getAttendeeForUser(eventId: string, userId: string): Promise<Attendee | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("attendees")
    .select("id,event_id,user_id,executive_flag,receive_nudges")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  return data ? mapAttendee(data) : null;
}

export async function listAttendees(eventId: string): Promise<Attendee[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("attendees")
    .select("id,event_id,user_id,executive_flag,receive_nudges")
    .eq("event_id", eventId);
  throwIfError(error);
  return (data ?? []).map(mapAttendee);
}

export async function listAttendeeDirectory(eventId: string): Promise<Array<{ attendeeId: string; userId: string; name: string; email: string }>> {
  const attendees = await listAttendees(eventId);
  const userIds = Array.from(new Set(attendees.map((attendee) => attendee.userId)));

  if (userIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("id,full_name,email").in("id", userIds);
  throwIfError(error);

  const userMap = new Map((data ?? []).map((user) => [user.id, user]));

  return attendees
    .map((attendee) => {
      const user = userMap.get(attendee.userId);
      if (!user) {
        return null;
      }

      return {
        attendeeId: attendee.id,
        userId: attendee.userId,
        name: user.full_name,
        email: user.email,
      };
    })
    .filter((entry): entry is { attendeeId: string; userId: string; name: string; email: string } => Boolean(entry));
}

export async function createAttendee(eventId: string, payload: { userId: string; executiveFlag: boolean }): Promise<Attendee> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("attendees")
    .insert({
      id: `att_${randomUUID()}`,
      event_id: eventId,
      user_id: payload.userId,
      executive_flag: payload.executiveFlag,
      receive_nudges: true,
    })
    .select("id,event_id,user_id,executive_flag,receive_nudges")
    .single();
  throwIfError(error);
  return mapAttendee(requireData(data, "attendees.insert"));
}

export async function getTravelForAttendee(eventId: string, attendeeId: string): Promise<TravelItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("travel_items")
    .select("id,attendee_id,event_id,type,provider,start_at,end_at,confirmation_code,location,notes,links")
    .eq("event_id", eventId)
    .eq("attendee_id", attendeeId)
    .order("start_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapTravel);
}

export async function listTravelByEvent(eventId: string): Promise<TravelItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("travel_items")
    .select("id,attendee_id,event_id,type,provider,start_at,end_at,confirmation_code,location,notes,links")
    .eq("event_id", eventId)
    .order("start_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapTravel);
}

export async function updateTravelItem(
  eventId: string,
  itemId: string,
  payload: { notes?: string; confirmationCode?: string; location?: string },
): Promise<TravelItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("travel_items")
    .update({
      notes: payload.notes,
      confirmation_code: payload.confirmationCode,
      location: payload.location,
    })
    .eq("event_id", eventId)
    .eq("id", itemId)
    .select("id,attendee_id,event_id,type,provider,start_at,end_at,confirmation_code,location,notes,links")
    .maybeSingle();
  throwIfError(error);
  return data ? mapTravel(data) : null;
}

export async function getAgendaByEvent(eventId: string): Promise<AgendaItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agenda_items")
    .select("id,event_id,title,location,start_at,end_at,description,speaker_ids")
    .eq("event_id", eventId)
    .order("start_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).map(mapAgenda);
}

export async function updateAgendaItem(
  eventId: string,
  itemId: string,
  payload: { title?: string; description?: string; location?: string },
): Promise<AgendaItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agenda_items")
    .update({ title: payload.title, description: payload.description, location: payload.location })
    .eq("event_id", eventId)
    .eq("id", itemId)
    .select("id,event_id,title,location,start_at,end_at,description,speaker_ids")
    .maybeSingle();
  throwIfError(error);
  return data ? mapAgenda(data) : null;
}

export async function getSpeakersByEvent(eventId: string): Promise<Speaker[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("speakers")
    .select("id,event_id,full_name,title,organization,bio,headshot_url")
    .eq("event_id", eventId);
  throwIfError(error);
  return (data ?? []).map(mapSpeaker);
}

export async function updateSpeaker(
  eventId: string,
  speakerId: string,
  payload: { bio?: string; title?: string; org?: string },
): Promise<Speaker | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("speakers")
    .update({ bio: payload.bio, title: payload.title, organization: payload.org })
    .eq("event_id", eventId)
    .eq("id", speakerId)
    .select("id,event_id,full_name,title,organization,bio,headshot_url")
    .maybeSingle();
  throwIfError(error);
  return data ? mapSpeaker(data) : null;
}

export async function getBriefByEvent(eventId: string): Promise<ExecutiveBrief | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("executive_briefs")
    .select("event_id,version,summary,speaker_synopsis,meeting_focus,watchouts,suggested_questions,generated_at,approved_at,approved_by,status")
    .eq("event_id", eventId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data ? mapBrief(data) : null;
}

export async function getNudgesByEvent(eventId: string, attendeeId?: string): Promise<CopilotNudge[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("copilot_nudges")
    .select("id,event_id,attendee_id,title,body,scheduled_at,source_rule,status,confidence,requires_admin_approval")
    .eq("event_id", eventId)
    .order("scheduled_at", { ascending: true });

  if (attendeeId) {
    query = query.eq("attendee_id", attendeeId);
  }

  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map(mapNudge);
}

export async function findNudge(eventId: string, nudgeId: string): Promise<CopilotNudge | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("copilot_nudges")
    .select("id,event_id,attendee_id,title,body,scheduled_at,source_rule,status,confidence,requires_admin_approval")
    .eq("event_id", eventId)
    .eq("id", nudgeId)
    .maybeSingle();
  throwIfError(error);
  return data ? mapNudge(data) : null;
}

export async function findNudgeByRule(eventId: string, attendeeId: string, sourceRule: string, scheduledAt: string): Promise<CopilotNudge | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("copilot_nudges")
    .select("id,event_id,attendee_id,title,body,scheduled_at,source_rule,status,confidence,requires_admin_approval")
    .eq("event_id", eventId)
    .eq("attendee_id", attendeeId)
    .eq("source_rule", sourceRule)
    .eq("scheduled_at", scheduledAt)
    .maybeSingle();
  throwIfError(error);
  return data ? mapNudge(data) : null;
}

export async function upsertNudge(nudge: CopilotNudge): Promise<CopilotNudge> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("copilot_nudges")
    .upsert({
      id: nudge.id,
      event_id: nudge.eventId,
      attendee_id: nudge.attendeeId,
      title: nudge.title,
      body: nudge.body,
      scheduled_at: nudge.scheduledAt,
      source_rule: nudge.sourceRule,
      status: nudge.status,
      confidence: nudge.confidence,
      requires_admin_approval: nudge.requiresAdminApproval,
    })
    .select("id,event_id,attendee_id,title,body,scheduled_at,source_rule,status,confidence,requires_admin_approval")
    .single();
  throwIfError(error);
  return mapNudge(requireData(data, "copilot_nudges.upsert"));
}

export async function getProfileById(personId: string): Promise<PersonProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("person_profiles")
    .select("id,event_id,person_type,full_name,email,organization,role_title,highlights,source_approved,updated_at")
    .eq("id", personId)
    .maybeSingle();
  throwIfError(error);
  return data ? mapProfile(data) : null;
}

export async function updateProfileFromDraft(personId: string, fields: EnrichmentDraft["fields"]): Promise<PersonProfile | null> {
  const updates: Record<string, unknown> = { source_approved: true, updated_at: new Date().toISOString() };

  for (const field of fields) {
    if (field.fieldName === "organization") updates.organization = field.value;
    if (field.fieldName === "roleTitle") updates.role_title = field.value;
    if (field.fieldName === "highlights") {
      updates.highlights = field.value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("person_profiles")
    .update(updates)
    .eq("id", personId)
    .select("id,event_id,person_type,full_name,email,organization,role_title,highlights,source_approved,updated_at")
    .maybeSingle();
  throwIfError(error);
  return data ? mapProfile(data) : null;
}

export async function getEnrichmentDraftByPerson(personId: string): Promise<EnrichmentDraft | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profile_enrichment_drafts")
    .select("id,event_id,person_id,provider,match_confidence,status,conflict_flags,generated_at,approved_at,approved_by")
    .eq("person_id", personId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);

  if (!data) {
    return null;
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("profile_field_provenance")
    .select("field_name,field_value,source_name,source_url,retrieved_at")
    .eq("draft_id", data.id);
  throwIfError(fieldsError);

  return {
    id: data.id,
    eventId: data.event_id,
    personId: data.person_id,
    provider: data.provider,
    matchConfidence: Number(data.match_confidence),
    status: data.status,
    conflictFlags: data.conflict_flags ?? [],
    generatedAt: data.generated_at,
    approvedAt: data.approved_at ?? undefined,
    approvedBy: data.approved_by ?? undefined,
    fields: (fields ?? []).map((field) => ({
      fieldName: field.field_name,
      value: field.field_value,
      source: field.source_name,
      sourceUrl: field.source_url ?? undefined,
      retrievedAt: field.retrieved_at,
    })),
  };
}

export async function upsertEnrichmentDraft(draft: EnrichmentDraft): Promise<EnrichmentDraft> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("profile_enrichment_drafts").upsert({
    id: draft.id,
    event_id: draft.eventId,
    person_id: draft.personId,
    provider: draft.provider,
    match_confidence: draft.matchConfidence,
    status: draft.status,
    conflict_flags: draft.conflictFlags,
    generated_at: draft.generatedAt,
    approved_at: draft.approvedAt ?? null,
    approved_by: draft.approvedBy ?? null,
  });
  throwIfError(error);

  await supabase.from("profile_field_provenance").delete().eq("draft_id", draft.id);
  if (draft.fields.length > 0) {
    const { error: fieldError } = await supabase.from("profile_field_provenance").insert(
      draft.fields.map((field, index) => ({
        id: `pfp_${draft.id}_${index}`,
        draft_id: draft.id,
        field_name: field.fieldName,
        field_value: field.value,
        source_name: field.source,
        source_url: field.sourceUrl ?? null,
        retrieved_at: field.retrievedAt,
      })),
    );
    throwIfError(fieldError);
  }

  return draft;
}

export async function insertAudit(action: string, actor: string, metadata: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("audit_log").insert({
    id: `aud_${randomUUID()}`,
    actor_id: actor,
    action,
    metadata,
  });
  throwIfError(error);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,role")
    .ilike("email", email)
    .maybeSingle();
  throwIfError(error);
  return data ? mapUser(data) : null;
}

export async function getOrCreateUserByEmail(email: string): Promise<User> {
  const existing = await getUserByEmail(email);
  if (existing) {
    return existing;
  }

  const bootstrapAdmin = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const role = bootstrapAdmin && email.toLowerCase() === bootstrapAdmin ? "admin" : "assistant";
  const displayName = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("users").insert({
    id: `usr_${randomUUID()}`,
    email,
    full_name: displayName || email,
    role,
  });

  if (error && error.code !== "23505") {
    throwIfError(error);
  }

  const created = await getUserByEmail(email);
  if (!created) {
    throw new Error("users.upsert: user record was not available after create");
  }

  return created;
}
