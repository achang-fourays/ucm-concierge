import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { getEnrichmentDraftByPerson, getProfileById, insertAudit, updateProfileFromDraft, upsertEnrichmentDraft } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; personId: string }> },
) {
  try {
    const { eventId, personId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const profile = await getProfileById(personId);
    const draft = await getEnrichmentDraftByPerson(personId);

    if (!profile || profile.eventId !== eventId || !draft || draft.eventId !== eventId) {
      return fail("Enrichment data unavailable", 404);
    }

    const updatedProfile = await updateProfileFromDraft(personId, draft.fields);

    const approvedDraft = await upsertEnrichmentDraft({
      ...draft,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: user.id,
    });

    await insertAudit("enrichment_approved", user.id, { personId, draftId: approvedDraft.id });

    return ok({ profile: updatedProfile, draft: approvedDraft });
  } catch (error) {
    return handleError(error);
  }
}
