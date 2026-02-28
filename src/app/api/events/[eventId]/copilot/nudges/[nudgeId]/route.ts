import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { findNudge, insertAudit, upsertNudge } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";
import { nudgeUpdateSchema } from "@/lib/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; nudgeId: string }> },
) {
  try {
    const { eventId, nudgeId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const body = nudgeUpdateSchema.parse(await request.json());
    const nudge = await findNudge(eventId, nudgeId);
    if (!nudge) {
      return fail("Nudge not found", 404);
    }

    const updated = await upsertNudge({ ...nudge, status: body.status });
    await insertAudit("nudge_updated", user.id, { nudgeId: updated.id, status: body.status });

    return ok({ nudge: updated });
  } catch (error) {
    return handleError(error);
  }
}
