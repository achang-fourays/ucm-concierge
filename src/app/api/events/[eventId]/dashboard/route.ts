import { parseISO } from "date-fns";
import { NextRequest } from "next/server";
import { TravelItem } from "@/lib/types";
import { getAgendaByEvent, getTravelForAttendee, listTravelByEvent } from "@/lib/db";
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
    address: "515 Mason Street, San Francisco, CA 94102",
    nickname: "JW Marriott Union Square",
    latitude: 37.788504,
    longitude: -122.410056,
  },
  {
    address: "150 Warriors Way, San Francisco, CA 94158",
    nickname: "OpenAI Rideshare",
  },
  {
    address: "25 Lusk St, San Francisco, CA 94107",
    nickname: "Private Dinner (25 Lusk)",
    latitude: 37.778616,
    longitude: -122.394722,
  },
];

const openAiRideshareAddress = "150 Warriors Way, San Francisco, CA 94158";
const registrationUberLink = "https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=150%20Warriors%20Way%2C%20San%20Francisco%2C%20CA%2094158&dropoff[nickname]=150%20Warriors%20Way&dropoff[latitude]=37.76808&dropoff[longitude]=-122.38770";
const dinnerUberLink = "https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=25%20Lusk%20St%2C%20San%20Francisco%2C%20CA%2094107&dropoff[nickname]=25%20Lusk";

function buildUberLink(destination: UberDestination): string {
  const parts = [
    "action=setPickup",
    "pickup=my_location",
    "dropoff[formatted_address]=" + encodeURIComponent(destination.address),
    "dropoff[nickname]=" + encodeURIComponent(destination.nickname),
  ];

  if (typeof destination.latitude === "number" && typeof destination.longitude === "number") {
    parts.push("dropoff[latitude]=" + destination.latitude);
    parts.push("dropoff[longitude]=" + destination.longitude);
  }

  return "https://m.uber.com/ul/?" + parts.join("&");
}

function inferDropoffDestination(item: TravelItem, defaultAddress: string): UberDestination {
  if (item.type === "hotel") {
    const knownHotel = knownDestinations.find((entry) => entry.nickname === "JW Marriott Union Square");
    if (knownHotel) {
      return knownHotel;
    }

    return {
      address: item.location || defaultAddress,
      nickname: item.provider || "Hotel",
    };
  }

  if (item.type === "flight" && item.location) {
    const routeMatch = item.location.match(/\b([A-Z]{3})\s*->\s*([A-Z]{3})\b/);
    if (routeMatch) {
      return airportDropoffs[routeMatch[2]] ?? { address: defaultAddress, nickname: "Destination" };
    }
  }

  if (item.location) {
    const normalized = item.location.toLowerCase();
    if (
      normalized.includes("1515 3rd") ||
      normalized.includes("openai hq") ||
      normalized.includes("mission bay") ||
      normalized.includes("warriors way")
    ) {
      return knownDestinations[1];
    }

    if (normalized.includes("25 lusk") || normalized.includes("private dinner")) {
      return knownDestinations[2];
    }

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
    address:
      defaultAddress.toLowerCase().includes("1515 3rd") || defaultAddress.toLowerCase().includes("openai")
        ? openAiRideshareAddress
        : defaultAddress,
    nickname:
      defaultAddress.toLowerCase().includes("1515 3rd") || defaultAddress.toLowerCase().includes("openai")
        ? "OpenAI Rideshare"
        : defaultAddress.split(",")[0] || "Destination",
  };
}

function getUberLinkForTravel(item: TravelItem, defaultAddress: string): string {
  const normalizedProvider = item.provider.toLowerCase();
  const normalizedLocation = (item.location || "").toLowerCase();

  if (
    normalizedProvider.includes("openai") ||
    normalizedProvider.includes("registration") ||
    normalizedLocation.includes("1515 3rd") ||
    normalizedLocation.includes("mission bay") ||
    normalizedLocation.includes("warriors way")
  ) {
    return registrationUberLink;
  }

  if (normalizedProvider.includes("dinner") || normalizedLocation.includes("25 lusk")) {
    return dinnerUberLink;
  }

  return buildUberLink(inferDropoffDestination(item, defaultAddress));
}

function getUberLinkForAgenda(title: string, location: string, defaultAddress: string): string | null {
  const normalizedTitle = title.toLowerCase();
  const normalizedLocation = location.toLowerCase();

  if (
    normalizedTitle.includes("registration") ||
    normalizedLocation.includes("1515 3rd") ||
    normalizedLocation.includes("mission bay") ||
    normalizedLocation.includes("openai")
  ) {
    return registrationUberLink;
  }

  if (normalizedTitle.includes("private dinner") || normalizedTitle.includes("private leadership dinner") || normalizedLocation.includes("25 lusk")) {
    return dinnerUberLink;
  }

  if (normalizedLocation && normalizedLocation !== "tbd") {
    return buildUberLink({
      address: location,
      nickname: title,
    });
  }

  if (defaultAddress) {
    return buildUberLink({
      address: defaultAddress,
      nickname: "Event Destination",
    });
  }

  return null;
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

    const now = new Date();
    const agenda = await getAgendaByEvent(eventId);
    const upcomingAgendaForActions = agenda.filter((item) => parseISO(item.endAt) > now).slice(0, 2);

    const upcomingTravelForActions = travelItems
      .filter((item) => parseISO(item.startAt) > now)
      .slice(0, 4);

    const travelActionCandidates = upcomingTravelForActions.map((item) => ({
      id: item.id,
      title: `${item.type.toUpperCase()} - ${item.provider}`,
      when: item.startAt,
      type: "travel" as const,
      description: item.notes ? `${item.location || "Travel segment"} | ${item.notes}` : item.location || "Travel segment",
      links: [{ label: "Open Uber", href: getUberLinkForTravel(item, event.venue) }],
      travelType: item.type,
    }));

    const agendaActionCandidates = upcomingAgendaForActions.map((session) => {
      const uberLink = getUberLinkForAgenda(session.title, session.location, event.venue);

      return {
        id: session.id,
        title: session.title,
        when: session.startAt,
        type: "agenda" as const,
        description: session.location + " - " + session.description,
        links: uberLink ? [{ label: "Open Uber", href: uberLink }] : undefined,
      };
    });

    const sortedCandidates = [...travelActionCandidates, ...agendaActionCandidates].sort((a, b) => a.when.localeCompare(b.when));

    const firstAction = sortedCandidates[0];
    const withoutNonImmediateHotels =
      firstAction && !(firstAction.type === "travel" && firstAction.travelType === "hotel")
        ? sortedCandidates.filter((candidate) => !(candidate.type === "travel" && candidate.travelType === "hotel"))
        : sortedCandidates;

    const nextActions = withoutNonImmediateHotels.slice(0, 2).map((candidate) =>
      candidate.type === "travel"
        ? {
            id: candidate.id,
            title: candidate.title,
            when: candidate.when,
            type: candidate.type,
            description: candidate.description,
            links: candidate.links,
          }
        : candidate,
    );

    return ok({ event, user, nextActions, travelItems, upcomingAgenda: agenda });
  } catch (error) {
    return handleError(error);
  }
}
