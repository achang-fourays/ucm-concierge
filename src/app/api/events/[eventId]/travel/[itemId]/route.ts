import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { updateTravelItem } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";
import { travelUpdateSchema } from "@/lib/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; itemId: string }> },
) {
  try {
    const { eventId, itemId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const payload = travelUpdateSchema.parse(await request.json());
    const item = await updateTravelItem(eventId, itemId, payload);

    if (!item) {
      return fail("Travel item not found", 404);
    }

    return ok({ travelItem: item });
  } catch (error) {
    return handleError(error);
  }
}
