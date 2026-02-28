import { NextRequest } from "next/server";
import { getAgendaByEvent } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    await getContext(request, eventId);
    return ok({ agenda: await getAgendaByEvent(eventId) });
  } catch (error) {
    return handleError(error);
  }
}
