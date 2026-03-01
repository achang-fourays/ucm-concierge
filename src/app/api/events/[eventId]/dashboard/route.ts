import { parseISO } from "date-fns";
import { NextRequest } from "next/server";
import { TravelItem } from "@/lib/types";
import { getAgendaByEvent, getNudgesByEvent, getTravelForAttendee, listTravelByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

const airportDropoffs: Record<string, string> = {
  SFO: "San Francisco International Airport, San Francisco, CA 94128",
  ORD: "Chicago O'Hare International Airport, Chicago, IL 60666",
  ATL: "Hartsfield-Jackson Atlanta International Airport, Atlanta, GA 30337",
  IAH: "George Bush Intercontinental Airport, Houston, TX 77032",
};

function buildUberLink(address: string): string {
  const params = new URLSearchParams({ action: "setPickup", pickup: "my_location" });
  params.set("dropoff[formatted_address]", address);
  params.set("dropoff[nickname]", address.split(",")[0]?.trim() || "Destination");
  return `https://m.uber.com/ul/?${params.toString()}`;
}

function normalizeUberLink(url: string): string {
  if (url.includes("m.uber.com/ul/?")) {
    return url;
  }

  if (url.startsWith("uber://")) {
    const query = url.split("?")[1] ?? "";
    return `https://m.uber.com/ul/?${query}`;
  }

  return url;
}

function inferDropoffAddress(item: TravelItem, defaultAddress: string): string {
  if (item.type === "flight" && item.location) {
    const routeMatch = item.location.match(/\b([A-Z]{3})\s*->\s*([A-Z]{3})\b/);
    if (routeMatch) {
      return airportDropoffs[routeMatch[2]] ?? defaultAddress;
    }
  }

  if (item.location && !item.location.match(/^[A-Z]{2,3}\s*\d+/)) {
    return item.location;
  }

  return defaultAddress;
}

function getUberLinkForTravel(item: TravelItem, defaultAddress: string): string {
  const inferredAddress = inferDropoffAddress(item, defaultAddress);

  if (item.links.uber) {
    return normalizeUberLink(item.links.uber);
  }

  return buildUberLink(inferredAddress);
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

    const agenda = await getAgendaByEvent(eventId);
    const upcomingAgendaForActions = agenda.filter((item) => parseISO(item.endAt) > new Date()).slice(0, 2);
    const nudges = effectiveAttendeeId ? await getNudgesByEvent(eventId, effectiveAttendeeId) : [];

    const nextActions = [
      ...travelItems.slice(0, 4).map((item) => ({
        id: item.id,
        title: `${item.type.toUpperCase()} - ${item.provider}`,
        when: item.startAt,
        type: "travel" as const,
        description: item.notes ? `${item.location || "Travel segment"} | ${item.notes}` : item.location || "Travel segment",
        links: [{ label: "Open Uber", href: getUberLinkForTravel(item, event.venue) }],
      })),
      ...upcomingAgendaForActions.map((session) => ({
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

    return ok({ event, user, nextActions, travelItems, upcomingAgenda: agenda, nudges });
  } catch (error) {
    return handleError(error);
  }
}
