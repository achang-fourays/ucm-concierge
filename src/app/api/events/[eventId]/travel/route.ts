import { NextRequest } from "next/server";
import { getTravelForAttendee, listTravelByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const { attendee, user } = await getContext(request, eventId);
    const selectedAttendeeId = request.nextUrl.searchParams.get("attendeeId");

    if (user.role === "traveler") {
      return ok({ travel: attendee ? await getTravelForAttendee(eventId, attendee.id) : [] });
    }

    if (selectedAttendeeId) {
      return ok({ travel: await getTravelForAttendee(eventId, selectedAttendeeId) });
    }

    if (attendee) {
      return ok({ travel: await getTravelForAttendee(eventId, attendee.id) });
    }

    return ok({ travel: await listTravelByEvent(eventId) });
  } catch (error) {
    return handleError(error);
  }
}
