import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(error: unknown): NextResponse<{ error: string }> {
  if (error instanceof ZodError) {
    return fail(error.issues.map((issue) => issue.message).join(", "), 400);
  }

  if (error instanceof Error && "status" in error) {
    return fail(error.message, Number(error.status) || 500);
  }

  return fail("Unexpected server error", 500);
}
