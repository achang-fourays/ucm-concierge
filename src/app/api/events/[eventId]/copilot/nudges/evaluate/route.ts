import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { evaluateNudges } from "@/lib/copilot";
import { findNudgeByRule, getAgendaByEvent, getTravelForAttendee, insertAudit, listAttendees, upsertNudge } from "@/lib/db";
import { getContext } from "@/lib/guards";
import { handleError, ok } from "@/lib/http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const { user } = await getContext(request, eventId);
    requireRole(user, ["assistant", "admin"]);

    const attendees = await listAttendees(eventId);
    const agenda = await getAgendaByEvent(eventId);
    const created = [];

    for (const attendee of attendees) {
      if (!attendee.preferences?.receiveNudges) {
        continue;
      }

      const travel = await getTravelForAttendee(eventId, attendee.id);
      const candidates = evaluateNudges(agenda, travel);

      for (const candidate of candidates) {
        const existing = await findNudgeByRule(eventId, attendee.id, candidate.sourceRule, candidate.scheduledAt);
        if (existing) {
          created.push(existing);
          continue;
        }

        const nudge = await upsertNudge({
          id: `ndg_${randomUUID()}`,
          eventId,
          attendeeId: attendee.id,
          title: candidate.title,
          body: candidate.body,
          scheduledAt: candidate.scheduledAt,
          sourceRule: candidate.sourceRule,
          status: "pending",
          confidence: candidate.confidence,
          requiresAdminApproval: true,
        });
        created.push(nudge);
      }
    }

    await insertAudit("nudges_evaluated", user.id, { eventId, generatedCount: created.length });

    return ok({ nudges: created });
  } catch (error) {
    return handleError(error);
  }
}
