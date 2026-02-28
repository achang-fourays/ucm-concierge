import { addMinutes, differenceInMinutes, formatDistanceToNowStrict, parseISO } from "date-fns";
import { AgendaItem, ContextScope, CopilotResponse, Speaker, TravelItem } from "@/lib/types";

interface BuildCopilotOptions {
  message: string;
  contextScope: ContextScope;
  travel: TravelItem[];
  agenda: AgendaItem[];
  speakers: Speaker[];
  brief: {
    version: number;
    suggestedQuestions: string[];
  } | null;
  now?: Date;
}

function guardrailPrefix(confidence: CopilotResponse["confidence"]): string {
  if (confidence === "low") {
    return "I may be missing complete context. Please verify with your assistant before committing. ";
  }

  if (confidence === "medium") {
    return "Based on available event records: ";
  }

  return "Confirmed from approved event data: ";
}

export function buildCopilotResponse({ message, contextScope, travel, agenda, speakers, brief, now = new Date() }: BuildCopilotOptions): CopilotResponse {
  const normalized = message.toLowerCase();

  let confidence: CopilotResponse["confidence"] = "high";
  const sources: CopilotResponse["sources"] = [];
  const suggestedActions: CopilotResponse["suggestedActions"] = [];
  let answer = "";

  if (normalized.includes("next") || normalized.includes("what's next")) {
    const nextAgenda = agenda.find((item) => parseISO(item.startAt) > now);
    const nextTravel = travel.find((item) => parseISO(item.startAt) > now);

    if (nextAgenda) {
      sources.push({ id: nextAgenda.id, label: nextAgenda.title, kind: "agenda" });
      suggestedActions.push({ id: "open-map", text: "Open venue map", action: "open_map" });
      answer = `Your next scheduled item is ${nextAgenda.title} at ${nextAgenda.location}. It starts ${formatDistanceToNowStrict(parseISO(nextAgenda.startAt), { addSuffix: true })}.`;
    } else if (nextTravel) {
      sources.push({ id: nextTravel.id, label: nextTravel.provider, kind: "travel" });
      answer = `Your next travel segment is ${nextTravel.type} with ${nextTravel.provider} ${formatDistanceToNowStrict(parseISO(nextTravel.startAt), { addSuffix: true })}.`;
    } else {
      confidence = "medium";
      answer = "There are no upcoming items on your itinerary right now.";
    }
  } else if (normalized.includes("venue") || normalized.includes("get to") || normalized.includes("uber")) {
    const nextAgenda = agenda.find((item) => parseISO(item.startAt) > now) ?? agenda[0];
    const hotel = travel.find((item) => item.type === "hotel");

    if (!nextAgenda || !hotel?.links.uber) {
      confidence = "low";
      answer = "I do not have enough route data yet to provide a reliable ride recommendation.";
    } else {
      const minutesToStart = differenceInMinutes(parseISO(nextAgenda.startAt), now);
      sources.push({ id: hotel.id, label: hotel.provider, kind: "travel" });
      sources.push({ id: nextAgenda.id, label: nextAgenda.title, kind: "agenda" });
      suggestedActions.push({ id: "open-uber", text: "Open Uber with venue preset", action: hotel.links.uber });
      answer = `From ${hotel.provider}, request your ride in about ${Math.max(minutesToStart - 30, 0)} minutes to arrive 10 minutes before ${nextAgenda.title}.`;
    }
  } else if (normalized.includes("speaker") || normalized.includes("ask")) {
    if (!speakers.length || !brief) {
      confidence = "low";
      answer = "Speaker intelligence is incomplete. Ask your assistant to refresh profile enrichment and briefing approval.";
    } else {
      const leadSpeaker = speakers[0];
      sources.push({ id: leadSpeaker.id, label: leadSpeaker.name, kind: "speaker" });
      sources.push({ id: `brief-${brief.version}`, label: "Approved executive brief", kind: "briefing" });
      suggestedActions.push({ id: "view-brief", text: "Open executive prep brief", action: "open_briefing" });
      suggestedActions.push({ id: "session-questions", text: "Pin suggested questions", action: "pin_questions" });
      answer = `${leadSpeaker.name} is likely to prioritize execution timeline and accountability. Ask: ${brief.suggestedQuestions[0]}`;
    }
  } else {
    confidence = "medium";
    const topSource =
      contextScope === "travel"
        ? travel[0] && { id: travel[0].id, label: travel[0].provider, kind: "travel" as const }
        : contextScope === "agenda"
          ? agenda[0] && { id: agenda[0].id, label: agenda[0].title, kind: "agenda" as const }
          : contextScope === "speakers"
            ? speakers[0] && { id: speakers[0].id, label: speakers[0].name, kind: "speaker" as const }
            : brief && { id: `brief-${brief.version}`, label: "Executive brief", kind: "briefing" as const };

    if (topSource) {
      sources.push(topSource);
    }

    suggestedActions.push({ id: "ask-next", text: "Ask: what's next for me?", action: "query_next" });
    answer = "I can help with travel timing, venue routing, speaker prep, and executive meeting strategy. Try asking for your next action.";
  }

  return {
    answer: `${guardrailPrefix(confidence)}${answer}`,
    sources,
    confidence,
    suggestedActions,
  };
}

export function evaluateNudges(agenda: AgendaItem[], travel: TravelItem[]) {
  const nudges: Array<{ title: string; body: string; scheduledAt: string; sourceRule: string; confidence: "high" | "medium" }> = [];
  const hotel = travel.find((item) => item.type === "hotel");

  for (const session of agenda) {
    const sessionStart = parseISO(session.startAt);
    const scheduledAt = addMinutes(sessionStart, -30).toISOString();

    nudges.push({
      title: `Leave for ${session.title}`,
      body: hotel
        ? `Plan to depart ${hotel.provider} 30 minutes before start for ${session.location}.`
        : `Prepare to arrive 10 minutes early at ${session.location}.`,
      scheduledAt,
      sourceRule: "session_start_buffer",
      confidence: hotel ? "high" : "medium",
    });
  }

  return nudges;
}
