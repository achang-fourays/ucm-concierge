import {
  AgendaItem,
  Attendee,
  BriefingDoc,
  CopilotConversation,
  CopilotMessage,
  CopilotNudge,
  EnrichmentDraft,
  Event,
  ExecutiveBrief,
  PersonProfile,
  Reminder,
  Speaker,
  TravelItem,
  User,
} from "@/lib/types";

const now = new Date("2026-03-10T13:00:00.000Z");

export const store = {
  users: [
    { id: "usr_admin", name: "Morgan Lee", email: "morgan@ucm.org", role: "admin" },
    { id: "usr_assistant", name: "Taylor Brooks", email: "taylor@ucm.org", role: "assistant" },
    { id: "usr_tom", name: "Tom", email: "Thomas.Jackiewicz@uchicagomedicine.org", role: "traveler" },
  ] as User[],

  events: [
    {
      id: "evt_ucm_austin_2026",
      title: "UCM Strategic Partner Summit",
      city: "Austin",
      venue: "Austin Convention Center, Hall C",
      timezone: "America/Chicago",
      startAt: "2026-03-12T14:00:00.000Z",
      endAt: "2026-03-13T22:30:00.000Z",
    },
  ] as Event[],

  attendees: [
    {
      id: "att_tom",
      eventId: "evt_ucm_austin_2026",
      userId: "usr_tom",
      executiveFlag: true,
      preferences: { receiveNudges: true },
    },
  ] as Attendee[],

  travelItems: [
    {
      id: "trv_flight_1",
      attendeeId: "att_tom",
      eventId: "evt_ucm_austin_2026",
      type: "flight",
      provider: "Delta",
      startAt: "2026-03-12T08:40:00.000Z",
      endAt: "2026-03-12T11:25:00.000Z",
      confirmationCode: "UCM42K",
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
      attendeeId: "att_tom",
      eventId: "evt_ucm_austin_2026",
      type: "hotel",
      provider: "Fairmont Austin",
      startAt: "2026-03-12T16:00:00.000Z",
      endAt: "2026-03-14T16:00:00.000Z",
      confirmationCode: "FMT-99813",
      location: "101 Red River St, Austin, TX",
      links: {
        provider: "https://www.fairmont.com/austin/",
        map: "https://maps.google.com/?q=Fairmont+Austin",
      },
    },
  ] as TravelItem[],

  speakers: [
    {
      id: "spk_ana",
      eventId: "evt_ucm_austin_2026",
      name: "Ana Ramirez",
      title: "VP Partnerships",
      org: "CivicGrid",
      bio: "Leads enterprise partnerships and has scaled multi-city digital infrastructure initiatives.",
    },
    {
      id: "spk_jon",
      eventId: "evt_ucm_austin_2026",
      name: "Jon Patel",
      title: "Chief Innovation Officer",
      org: "TransitWorks",
      bio: "Specializes in AI-enabled transit systems and strategic public-private collaboration.",
    },
  ] as Speaker[],

  agendaItems: [
    {
      id: "ag_1",
      eventId: "evt_ucm_austin_2026",
      title: "Executive Welcome and Strategic Priorities",
      location: "Hall C Main Stage",
      startAt: "2026-03-12T15:00:00.000Z",
      endAt: "2026-03-12T16:00:00.000Z",
      description: "Align on UCM priorities and define expected outcomes for partner discussions.",
      speakerIds: ["spk_ana"],
    },
    {
      id: "ag_2",
      eventId: "evt_ucm_austin_2026",
      title: "Innovation Roundtable",
      location: "Room 403",
      startAt: "2026-03-12T18:00:00.000Z",
      endAt: "2026-03-12T19:00:00.000Z",
      description: "Discussion on operational risks, upcoming policy shifts, and partnership asks.",
      speakerIds: ["spk_jon"],
    },
  ] as AgendaItem[],

  executiveBriefs: [
    {
      eventId: "evt_ucm_austin_2026",
      version: 2,
      status: "approved",
      summary:
        "UCM should secure an implementation pilot with CivicGrid while confirming TransitWorks integration milestones and governance commitments.",
      speakerSynopsis: [
        "Ana Ramirez is focused on rapid pilot execution and expects clear budget ownership.",
        "Jon Patel wants alignment on integration risk-sharing and phased rollouts.",
      ],
      meetingFocus:
        "Lock terms for a 90-day pilot, agree KPI definitions, and establish a joint executive steering cadence.",
      watchouts: [
        "Avoid agreeing to broad data-sharing without legal constraints.",
        "Press for concrete delivery dates tied to measurable milestones.",
      ],
      suggestedQuestions: [
        "What operating constraints could delay the pilot in quarter one?",
        "Which KPI should determine go/no-go at day 90?",
        "What governance structure prevents scope creep after launch?",
      ],
      generatedAt: "2026-03-12T12:30:00.000Z",
      approvedAt: "2026-03-12T13:10:00.000Z",
      approvedBy: "usr_admin",
    },
  ] as ExecutiveBrief[],

  briefingDocs: [
    {
      id: "doc_1",
      eventId: "evt_ucm_austin_2026",
      uploadedBy: "usr_assistant",
      fileName: "partner-briefing-notes.pdf",
      parsedStatus: "parsed",
      uploadedAt: "2026-03-11T19:00:00.000Z",
    },
  ] as BriefingDoc[],

  conversations: [] as CopilotConversation[],
  messages: [] as CopilotMessage[],

  nudges: [
    {
      id: "ndg_1",
      eventId: "evt_ucm_austin_2026",
      attendeeId: "att_tom",
      title: "Head to venue",
      body: "Leave in 20 minutes to arrive 10 minutes early for executive welcome.",
      scheduledAt: "2026-03-12T14:35:00.000Z",
      sourceRule: "session_start_buffer",
      status: "approved",
      confidence: "high",
      requiresAdminApproval: true,
    },
  ] as CopilotNudge[],

  profiles: [
    {
      id: "prf_ana",
      eventId: "evt_ucm_austin_2026",
      personType: "speaker",
      name: "Ana Ramirez",
      organization: "CivicGrid",
      roleTitle: "VP Partnerships",
      highlights: ["Scaled three city rollouts", "Led enterprise procurement partnerships"],
      sourceApproved: true,
      updatedAt: "2026-03-11T16:00:00.000Z",
    },
  ] as PersonProfile[],

  enrichmentDrafts: [
    {
      id: "enr_ana_1",
      eventId: "evt_ucm_austin_2026",
      personId: "prf_ana",
      provider: "LinkedIn Marketing Developer Platform",
      matchConfidence: 0.93,
      status: "approved",
      conflictFlags: [],
      fields: [
        {
          fieldName: "roleTitle",
          value: "VP Partnerships",
          source: "LinkedIn API",
          sourceUrl: "https://www.linkedin.com",
          retrievedAt: "2026-03-11T14:00:00.000Z",
        },
      ],
      generatedAt: "2026-03-11T14:01:00.000Z",
      approvedAt: "2026-03-11T15:00:00.000Z",
      approvedBy: "usr_admin",
    },
  ] as EnrichmentDraft[],

  reminders: [
    {
      id: "rem_1",
      eventId: "evt_ucm_austin_2026",
      attendeeId: "att_tom",
      channel: "email",
      sendAt: "2026-03-12T14:30:00.000Z",
      status: "scheduled",
      templateKey: "venue_departure",
    },
  ] as Reminder[],

  auditLog: [] as Array<{ id: string; action: string; actor: string; createdAt: string; metadata: Record<string, unknown> }>,
};

export function getEvent(eventId: string): Event | undefined {
  return store.events.find((event) => event.id === eventId);
}

export function getUser(userId: string): User | undefined {
  return store.users.find((user) => user.id === userId);
}

export function getAttendeeForUser(eventId: string, userId: string): Attendee | undefined {
  return store.attendees.find((attendee) => attendee.eventId === eventId && attendee.userId === userId);
}

export function getEventSpeakers(eventId: string): Speaker[] {
  return store.speakers.filter((speaker) => speaker.eventId === eventId);
}

export function getEventAgenda(eventId: string): AgendaItem[] {
  return store.agendaItems
    .filter((item) => item.eventId === eventId)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function getTravelForAttendee(eventId: string, attendeeId: string): TravelItem[] {
  return store.travelItems
    .filter((item) => item.eventId === eventId && item.attendeeId === attendeeId)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function getBrief(eventId: string): ExecutiveBrief | undefined {
  return store.executiveBriefs.find((brief) => brief.eventId === eventId);
}

export function getNudges(eventId: string, attendeeId?: string): CopilotNudge[] {
  return store.nudges.filter((nudge) => nudge.eventId === eventId && (!attendeeId || nudge.attendeeId === attendeeId));
}

export function upsertNudge(nudge: CopilotNudge): CopilotNudge {
  const existing = store.nudges.findIndex((item) => item.id === nudge.id);
  if (existing >= 0) {
    store.nudges[existing] = nudge;
  } else {
    store.nudges.push(nudge);
  }
  return nudge;
}

export function saveConversation(conversation: CopilotConversation): void {
  store.conversations.push(conversation);
}

export function saveMessage(message: CopilotMessage): void {
  store.messages.push(message);
}

export function getProfile(personId: string): PersonProfile | undefined {
  return store.profiles.find((profile) => profile.id === personId);
}

export function getEnrichmentDraft(personId: string): EnrichmentDraft | undefined {
  return store.enrichmentDrafts.find((draft) => draft.personId === personId);
}

export function upsertEnrichmentDraft(draft: EnrichmentDraft): EnrichmentDraft {
  const existing = store.enrichmentDrafts.findIndex((item) => item.id === draft.id);
  if (existing >= 0) {
    store.enrichmentDrafts[existing] = draft;
  } else {
    store.enrichmentDrafts.push(draft);
  }
  return draft;
}

export function addAudit(action: string, actor: string, metadata: Record<string, unknown>): void {
  store.auditLog.push({
    id: `aud_${store.auditLog.length + 1}`,
    action,
    actor,
    createdAt: new Date().toISOString(),
    metadata,
  });
}

export function getNow(): Date {
  return now;
}
