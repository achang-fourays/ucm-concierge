export type Role = "traveler" | "assistant" | "admin";

export type Confidence = "high" | "medium" | "low";

export type ContextScope = "travel" | "agenda" | "speakers" | "briefing" | "all";

export type TravelType = "flight" | "hotel" | "car" | "other";

export type ReminderChannel = "in_app" | "email";

export type NudgeStatus = "pending" | "approved" | "snoozed" | "disabled" | "sent";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Event {
  id: string;
  title: string;
  city: string;
  venue: string;
  timezone: string;
  startAt: string;
  endAt: string;
}

export interface Attendee {
  id: string;
  eventId: string;
  userId: string;
  executiveFlag: boolean;
  preferences?: {
    receiveNudges: boolean;
  };
}

export interface TravelItem {
  id: string;
  attendeeId: string;
  eventId: string;
  type: TravelType;
  provider: string;
  startAt: string;
  endAt?: string;
  confirmationCode?: string;
  location?: string;
  notes?: string;
  links: {
    provider?: string;
    map?: string;
    uber?: string;
  };
}

export interface Speaker {
  id: string;
  eventId: string;
  name: string;
  title: string;
  org: string;
  bio: string;
  headshotUrl?: string;
  linkedinUrl?: string;
}

export interface AgendaItem {
  id: string;
  eventId: string;
  title: string;
  location: string;
  startAt: string;
  endAt: string;
  description: string;
  speakerIds: string[];
}

export interface ExecutiveBrief {
  eventId: string;
  version: number;
  summary: string;
  speakerSynopsis: string[];
  meetingFocus: string;
  watchouts: string[];
  suggestedQuestions: string[];
  generatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  status: "draft" | "approved";
}

export interface BriefingDoc {
  id: string;
  eventId: string;
  uploadedBy: string;
  fileName: string;
  parsedStatus: "queued" | "parsed" | "failed";
  uploadedAt: string;
}

export interface CopilotSource {
  id: string;
  label: string;
  kind: "travel" | "agenda" | "speaker" | "briefing" | "external_profile";
}

export interface CopilotSuggestion {
  id: string;
  text: string;
  action: string;
}

export interface CopilotResponse {
  answer: string;
  sources: CopilotSource[];
  confidence: Confidence;
  suggestedActions: CopilotSuggestion[];
}

export interface CopilotConversation {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
}

export interface CopilotMessage {
  id: string;
  conversationId: string;
  sender: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CopilotNudge {
  id: string;
  eventId: string;
  attendeeId: string;
  title: string;
  body: string;
  scheduledAt: string;
  sourceRule: string;
  status: NudgeStatus;
  confidence: Confidence;
  requiresAdminApproval: boolean;
}

export interface PersonProfile {
  id: string;
  eventId: string;
  personType: "speaker" | "invitee";
  name: string;
  email?: string;
  organization?: string;
  roleTitle?: string;
  highlights: string[];
  sourceApproved: boolean;
  updatedAt: string;
}

export interface ProvenanceField {
  fieldName: string;
  value: string;
  source: string;
  sourceUrl?: string;
  retrievedAt: string;
}

export interface EnrichmentDraft {
  id: string;
  eventId: string;
  personId: string;
  provider: string;
  matchConfidence: number;
  status: "draft" | "approved" | "rejected";
  conflictFlags: string[];
  fields: ProvenanceField[];
  generatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Reminder {
  id: string;
  eventId: string;
  attendeeId: string;
  channel: ReminderChannel;
  sendAt: string;
  status: "scheduled" | "sent" | "failed";
  templateKey: string;
}

export interface DashboardPayload {
  event: Event;
  user: User;
  nextActions: Array<{
    id: string;
    title: string;
    when: string;
    type: "travel" | "agenda" | "nudge";
    description: string;
    links?: { label: string; href: string }[];
  }>;
  travelItems: TravelItem[];
  upcomingAgenda: AgendaItem[];
  nudges: CopilotNudge[];
}
