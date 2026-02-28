"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const finishSignIn = async () => {
      const supabase = getSupabaseBrowserClient();
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      try {
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email",
          });

          if (verifyError) {
            throw verifyError;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError("Sign-in session could not be created. Please try again.");
          return;
        }

        router.replace("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    };

    void finishSignIn();
  }, [router]);

  return (
    <main className="mx-auto mt-14 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Completing sign in...</h1>
      <p className="mt-2 text-sm text-slate-600">One moment while we verify your magic link.</p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}
