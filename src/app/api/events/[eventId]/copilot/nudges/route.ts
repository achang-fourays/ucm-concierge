import { NextRequest } from "next/server";
import { getNudgesByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const { attendee, user } = await getContext(request, eventId);
    const nudges = user.role === "traveler" && attendee ? await getNudgesByEvent(eventId, attendee.id) : await getNudgesByEvent(eventId);
    return ok({ nudges });
  } catch (error) {
    return handleError(error);
  }
}
