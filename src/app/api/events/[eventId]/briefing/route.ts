import { NextRequest } from "next/server";
import { getBriefByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { fail, handleError, ok } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    await getContext(request, eventId);

    const brief = await getBriefByEvent(eventId);
    if (!brief || brief.status !== "approved") {
      return fail("Approved executive briefing not available", 404);
    }

    return ok({ brief });
  } catch (error) {
    return handleError(error);
  }
}
