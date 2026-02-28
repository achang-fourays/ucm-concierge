import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAttendee, listAttendeeDirectory } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";
import { attendeeSchema } from "@/lib/schemas";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    await getContext(request, eventId);
    const attendees = await listAttendeeDirectory(eventId);
    return ok({ attendees });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const body = attendeeSchema.parse(await request.json());
    const attendee = await createAttendee(eventId, { userId: body.userId, executiveFlag: body.executiveFlag });

    return ok({ attendee }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
