import { NextRequest } from "next/server";
import { getSessionUser, requireRole } from "@/lib/auth";
import { createEvent } from "@/lib/db";
import { handleError, ok } from "@/lib/http";
import { eventSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    requireRole(user, ["assistant", "admin"]);

    const body = eventSchema.parse(await request.json());
    const event = await createEvent(body);

    return ok({ event }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
