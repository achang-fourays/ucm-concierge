"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
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
      setError(err instanceof Error ? err.message : "Unable to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-14 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">We will email you a secure sign-in link.</p>

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
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </main>
  );
}
