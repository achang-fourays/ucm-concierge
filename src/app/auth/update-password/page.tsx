"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setMessage("Password updated. Redirecting...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-14 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Set your password</h1>
      <p className="mt-2 text-sm text-slate-600">Choose a password for email/password sign in.</p>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label className="block text-sm font-medium text-slate-700" htmlFor="confirm-password">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Saving..." : "Save Password"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </main>
  );
}
