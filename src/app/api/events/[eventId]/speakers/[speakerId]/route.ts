import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { updateSpeaker } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";
import { speakerUpdateSchema } from "@/lib/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; speakerId: string }> },
) {
  try {
    const { eventId, speakerId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const payload = speakerUpdateSchema.parse(await request.json());
    const item = await updateSpeaker(eventId, speakerId, payload);

    if (!item) {
      return fail("Speaker not found", 404);
    }

    return ok({ speaker: item });
  } catch (error) {
    return handleError(error);
  }
}
