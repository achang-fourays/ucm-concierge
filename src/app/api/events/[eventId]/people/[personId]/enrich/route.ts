import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { getProfileById, insertAudit, upsertEnrichmentDraft } from "@/lib/db";
import { runCompliantEnrichment } from "@/lib/enrichment/providers";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; personId: string }> },
) {
  try {
    const { eventId, personId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const profile = await getProfileById(personId);
    if (!profile || profile.eventId !== eventId) {
      return fail("Person profile not found", 404);
    }

    const draft = await runCompliantEnrichment(profile);
    await upsertEnrichmentDraft(draft);
    await insertAudit("profile_enriched", user.id, { personId, draftId: draft.id, confidence: draft.matchConfidence });

    return ok({ draft });
  } catch (error) {
    return handleError(error);
  }
}
