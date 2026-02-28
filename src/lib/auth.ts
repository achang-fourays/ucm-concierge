import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { getOrCreateUserByEmail } from "@/lib/db";
import { Role, User } from "@/lib/types";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export async function getSessionUser(request: NextRequest): Promise<User> {
  const token = getBearerToken(request);
  if (!token) {
    throw new AuthError("Missing session token. Please sign in.", 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new AuthError("Supabase public environment variables are missing", 500);
  }

  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user?.email) {
    throw new AuthError("Invalid or expired session. Please sign in again.", 401);
  }

  return getOrCreateUserByEmail(data.user.email);
}

export function requireRole(user: User, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError("Insufficient permissions", 403);
  }
}
