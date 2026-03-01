"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

function getType(value: string | null): OtpType | null {
  if (!value) {
    return null;
  }

  const allowed = new Set<OtpType>([
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ]);

  return allowed.has(value as OtpType) ? (value as OtpType) : null;
}

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const finishSignIn = async () => {
      const supabase = getSupabaseBrowserClient();
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const queryError = query.get("error_description") ?? query.get("error");
      const hashError = hash.get("error_description") ?? hash.get("error");
      if (queryError || hashError) {
        setError(decodeURIComponent(queryError ?? hashError ?? "Sign-in failed"));
        return;
      }

      const tokenHash = query.get("token_hash") ?? hash.get("token_hash");
      const type = getType(query.get("type") ?? hash.get("type"));
      const code = query.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const requestedNext = getSafeNextPath(query.get("next") ?? hash.get("next"));
      const nextPath =
        requestedNext !== "/" ? requestedNext : type === "recovery" ? "/auth/update-password" : "/dashboard";

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (verifyError) {
            throw verifyError;
          }
        } else if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            throw setSessionError;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError(
            "Sign-in session could not be created. Please request a new sign-in or reset link and click only the newest email once.",
          );
          return;
        }

        router.replace(nextPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign-in failed";
        setError(message);
      }
    };

    void finishSignIn();
  }, [router]);

  return (
    <main className="mx-auto mt-14 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Completing sign in...</h1>
      <p className="mt-2 text-sm text-slate-600">One moment while we verify your sign-in link.</p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}
