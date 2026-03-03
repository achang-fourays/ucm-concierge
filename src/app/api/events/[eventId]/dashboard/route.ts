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
    latitude: 37.7692589,
    longitude: -122.3881822,
  },
  {
    address: "25 Lusk St, San Francisco, CA 94107",
    nickname: "Private Dinner (25 Lusk)",
    latitude: 37.778616,
    longitude: -122.394722,
  },
];

const openAiRideshareAddress = "150 Warriors Way, San Francisco, CA 94158";
const registrationUberLink = "https://m.uber.com/looking?drop%5B0%5D=%7B%22addressLine1%22%3A%22150%20Warriors%20Way%22%2C%22addressLine2%22%3A%22San%20Francisco%2C%20CA%22%2C%22id%22%3A%228ed655fe-956c-5f79-1301-71fd87d540b7%22%2C%22source%22%3A%22SEARCH%22%2C%22latitude%22%3A37.7688367%2C%22longitude%22%3A-122.388905%2C%22provider%22%3A%22uber_places%22%7D&marketing_vistor_id=b0ba3781-e2b8-4e41-8182-e027cf6914ad&uclick_id=2fe50e02-9101-49ea-935f-24ceaef9ddc0";

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
  return buildUberLink(inferDropoffDestination(item, defaultAddress));
}

function getUberLinkForAgenda(title: string): string | null {
  const normalizedTitle = title.toLowerCase();

  // Only keep rideshare for the registration/lunch block; no links for 1:1 or other meetings.
  if (normalizedTitle.includes("nate gross") || normalizedTitle.includes("1:1") || normalizedTitle.includes("1-1") || normalizedTitle.includes("one-on-one") || normalizedTitle.includes("one on one") || normalizedTitle.includes("private 1")) {
    return null;
  }

  if (normalizedTitle.includes("registration & lunch") || normalizedTitle.startsWith("registration")) {
    return registrationUberLink;
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
      travelType: item.type,
    }));

    const agendaActionCandidates = upcomingAgendaForActions.map((session) => ({
      id: session.id,
      title: session.title,
      when: session.startAt,
      type: "agenda" as const,
      description: session.location + " - " + session.description,
    }));

    const sortedCandidates = [...travelActionCandidates, ...agendaActionCandidates].sort((a, b) => a.when.localeCompare(b.when));

    const hasArrivedInSanFrancisco = travelItems.some((item) => {
      if (item.type !== "flight") {
        return false;
      }

      const location = (item.location || "").toUpperCase();
      const routeMatch = location.match(/\b([A-Z]{3})\s*->\s*([A-Z]{3})\b/);
      const destinationAirport = routeMatch?.[2];

      return destinationAirport === "SFO" && Boolean(item.endAt) && parseISO(item.endAt as string) <= now;
    });

    const firstAction = sortedCandidates[0];
    const withoutNonImmediateHotels =
      hasArrivedInSanFrancisco && firstAction && !(firstAction.type === "travel" && firstAction.travelType === "hotel")
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
          }
        : candidate,
    );

    return ok({ event, user, nextActions, travelItems, upcomingAgenda: agenda });
  } catch (error) {
    return handleError(error);
  }
}
