import { NextRequest } from "next/server";
import { getEnrichmentDraftByPerson } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; personId: string }> },
) {
  try {
    const { eventId, personId } = await params;
    await getContext(request, eventId);

    const draft = await getEnrichmentDraftByPerson(personId);
    if (!draft || draft.eventId !== eventId) {
      return fail("No enrichment draft found", 404);
    }

    return ok({ draft });
  } catch (error) {
    return handleError(error);
  }
}
