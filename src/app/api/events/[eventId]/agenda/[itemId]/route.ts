import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { updateAgendaItem } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";
import { agendaUpdateSchema } from "@/lib/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  try {
    const { eventId, itemId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const payload = agendaUpdateSchema.parse(await request.json());
    const item = await updateAgendaItem(eventId, itemId, payload);

    if (!item) {
      return fail("Agenda item not found", 404);
    }

    return ok({ agendaItem: item });
  } catch (error) {
    return handleError(error);
  }
}
