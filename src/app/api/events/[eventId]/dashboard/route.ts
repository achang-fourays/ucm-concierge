import { parseISO } from "date-fns";
import { NextRequest } from "next/server";
import { TravelItem } from "@/lib/types";
import { getAgendaByEvent, getNudgesByEvent, getTravelForAttendee, listTravelByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

type UberDestination = {
  address: string;
  nickname: string;
  latitude?: number;
  longitude?: number;
};

const airportDropoffs: Record<string, UberDestination> = {
  SFO: {
    address: "San Francisco International Airport, San Francisco, CA 94128",
    nickname: "SFO Airport",
    latitude: 37.621313,
    longitude: -122.378955,
  },
  ORD: {
    address: "Chicago O'Hare International Airport, Chicago, IL 60666",
    nickname: "ORD Airport",
    latitude: 41.974163,
    longitude: -87.907321,
  },
  ATL: {
    address: "Hartsfield-Jackson Atlanta International Airport, Atlanta, GA 30337",
    nickname: "ATL Airport",
    latitude: 33.640411,
    longitude: -84.419853,
  },
  IAH: {
    address: "George Bush Intercontinental Airport, Houston, TX 77032",
    nickname: "IAH Airport",
    latitude: 29.990219,
    longitude: -95.336783,
  },
};

const knownDestinations: UberDestination[] = [
  {
    address: "JW Marriott San Francisco Union Square, 515 Mason Street, San Francisco, California, USA, 94102",
    nickname: "JW Marriott",
    latitude: 37.788488,
    longitude: -122.409046,
  },
  {
    address: "1515 3rd Street, San Francisco, CA 94158",
    nickname: "OpenAI HQ",
    latitude: 37.769204,
    longitude: -122.387715,
  },
];

function buildUberLink(destination: UberDestination): string {
  const params = new URLSearchParams({ action: "setPickup", pickup: "my_location" });
  params.set("dropoff[formatted_address]", destination.address);
  params.set("dropoff[nickname]", destination.nickname);

  if (typeof destination.latitude === "number" && typeof destination.longitude === "number") {
    params.set("dropoff[latitude]", String(destination.latitude));
    params.set("dropoff[longitude]", String(destination.longitude));
  }

  return `https://m.uber.com/ul/?${params.toString()}`;
}

function inferDropoffDestination(item: TravelItem, defaultAddress: string): UberDestination {
  if (item.type === "flight" && item.location) {
    const routeMatch = item.location.match(/\b([A-Z]{3})\s*->\s*([A-Z]{3})\b/);
    if (routeMatch) {
      return airportDropoffs[routeMatch[2]] ?? { address: defaultAddress, nickname: "Destination" };
    }
  }

  if (item.location) {
    const normalized = item.location.toLowerCase();
    const known = knownDestinations.find(
      (entry) => normalized.includes(entry.nickname.toLowerCase()) || normalized.includes(entry.address.toLowerCase()),
    );

    if (known) {
      return known;
    }

    if (!item.location.match(/^[A-Z]{2,3}\s*\d+/)) {
      return {
        address: item.location,
        nickname: item.provider || item.location.split(",")[0] || "Destination",
      };
    }
  }

  return {
    address: defaultAddress,
    nickname: defaultAddress.split(",")[0] || "Destination",
  };
}

function getUberLinkForTravel(item: TravelItem, defaultAddress: string): string {
  return buildUberLink(inferDropoffDestination(item, defaultAddress));
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
