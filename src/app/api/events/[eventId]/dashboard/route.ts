import { parseISO } from "date-fns";
import { NextRequest } from "next/server";
import { getAgendaByEvent, getNudgesByEvent, getTravelForAttendee, listTravelByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

function providerLinkLabel(type: string): string {
  if (type === "flight") return "Flight status";
  if (type === "hotel") return "Hotel details";
  if (type === "car") return "Transfer details";
  return "Booking details";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const { user, event, attendee } = await getContext(request, eventId);
    const selectedAttendeeId = request.nextUrl.searchParams.get("attendeeId");

    const effectiveAttendeeId =
      user.role === "traveler"
        ? attendee?.id
        : selectedAttendeeId || attendee?.id || null;

    const travelItems = effectiveAttendeeId
      ? await getTravelForAttendee(eventId, effectiveAttendeeId)
      : user.role === "traveler"
        ? []
        : await listTravelByEvent(eventId);

    const upcomingAgenda = (await getAgendaByEvent(eventId)).filter((item) => parseISO(item.endAt) > new Date()).slice(0, 6);
    const nudges = effectiveAttendeeId ? await getNudgesByEvent(eventId, effectiveAttendeeId) : [];

    const nextActions = [
      ...travelItems.slice(0, 4).map((item) => ({
        id: item.id,
        title: `${item.type.toUpperCase()} - ${item.provider}`,
        when: item.startAt,
        type: "travel" as const,
        description: item.notes ? `${item.location || "Travel segment"} | ${item.notes}` : item.location || "Travel segment",
        links: item.links.provider ? [{ label: providerLinkLabel(item.type), href: item.links.provider }] : undefined,
      })),
      ...upcomingAgenda.slice(0, 2).map((session) => ({
        id: session.id,
        title: session.title,
        when: session.startAt,
        type: "agenda" as const,
        description: `${session.location} - ${session.description}`,
      })),
      ...nudges.slice(0, 2).map((nudge) => ({
        id: nudge.id,
        title: nudge.title,
        when: nudge.scheduledAt,
        type: "nudge" as const,
        description: nudge.body,
      })),
    ]
      .sort((a, b) => a.when.localeCompare(b.when))
      .slice(0, 2);

    return ok({ event, user, nextActions, travelItems, upcomingAgenda, nudges });
  } catch (error) {
    return handleError(error);
  }
}
