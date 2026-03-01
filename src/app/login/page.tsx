"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type LoginMode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "password") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        router.replace("/");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Check your email and click the sign-in link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  const onSendReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Enter your email first, then click reset password.");
      return;
    }

    setResetting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage("Password reset link sent. Use the newest email link to set your password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset link");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="mx-auto mt-14 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Use a magic link or your email/password.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-1">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm ${mode === "magic" ? "bg-slate-900 text-white" : "text-slate-700"}`}
          onClick={() => {
            setMode("magic");
            setError("");
            setMessage("");
          }}
        >
          Magic Link
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm ${mode === "password" ? "bg-slate-900 text-white" : "text-slate-700"}`}
          onClick={() => {
            setMode("password");
            setError("");
            setMessage("");
          }}
        >
          Password
        </button>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {mode === "password" && (
          <>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full rounded-xl border border-slate-300 p-2 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        )}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Working..." : mode === "password" ? "Sign In" : "Send Magic Link"}
        </button>
      </form>

      {mode === "password" && (
        <button
          type="button"
          className="mt-3 text-sm text-slate-700 underline"
          onClick={onSendReset}
          disabled={resetting}
        >
          {resetting ? "Sending reset link..." : "Forgot password? Send reset link"}
        </button>
      )}

      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </main>
  );
}
