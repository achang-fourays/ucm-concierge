import { NextRequest } from "next/server";
import { buildCopilotResponse } from "@/lib/copilot";
import { getAgendaByEvent, getBriefByEvent, getSpeakersByEvent, getTravelForAttendee, listAttendees } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";
import { chatSchema } from "@/lib/schemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const { user, attendee } = await getContext(request, eventId);
    const body = chatSchema.parse(await request.json());

    const requestedAttendeeId = body.attendeeId ?? body.attendee_id;
    let effectiveAttendeeId: string | null = null;

    if (user.role === "traveler") {
      effectiveAttendeeId = attendee?.id ?? null;
    } else {
      effectiveAttendeeId = requestedAttendeeId ?? attendee?.id ?? null;
      if (effectiveAttendeeId) {
        const validAttendees = await listAttendees(eventId);
        const isValid = validAttendees.some((entry) => entry.id === effectiveAttendeeId);
        if (!isValid) {
          effectiveAttendeeId = null;
        }
      }
    }

    if (!effectiveAttendeeId) {
      return ok({
        answer: "I could not determine which attendee profile to use. Please select Tom, Amy, or Andy and try again.",
        confidence: "low",
        sources: [],
        suggestedActions: [{ id: "select-attendee", text: "Select an attendee filter and ask again", action: "select_attendee" }],
      });
    }

    const [travel, agenda, speakers, brief] = await Promise.all([
      getTravelForAttendee(eventId, effectiveAttendeeId),
      getAgendaByEvent(eventId),
      getSpeakersByEvent(eventId),
      getBriefByEvent(eventId),
    ]);

    const response = buildCopilotResponse({
      message: body.message,
      contextScope: body.context_scope,
      travel,
      agenda,
      speakers,
      brief,
    });

    return ok(response);
  } catch (error) {
    return handleError(error);
  }
}
