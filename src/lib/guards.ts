import { NextRequest } from "next/server";
import { AuthError, getSessionUser } from "@/lib/auth";
import { getAttendeeForUser, getEventById } from "@/lib/db";

export async function getContext(request: NextRequest, eventId: string) {
  const user = await getSessionUser(request);
  const event = await getEventById(eventId);

  if (!event) {
    throw new AuthError("Event not found", 404);
  }

  const attendee = await getAttendeeForUser(eventId, user.id);

  if (!attendee && user.role === "traveler") {
    throw new AuthError("Traveler is not assigned to this event", 403);
  }

  return { user, event, attendee };
}
