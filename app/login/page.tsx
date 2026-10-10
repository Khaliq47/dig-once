"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const DEMO_PASSWORD = "demo123456";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: string, p: string, redirectTo: string) {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.assign(redirectTo);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 font-display text-4xl font-bold">Login</h1>
      <p className="mb-4 text-sm text-muted">
        Residents can browse without logging in. The department portal needs a department account, so use the demo button below.
      </p>

      <div className="mb-6 flex flex-col gap-2">
        <button
          disabled={loading}
          onClick={() => signIn("citizen@demo.com", DEMO_PASSWORD, "/search")}
          className="rounded-sm bg-ink px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Login as Citizen (demo)
        </button>
        <button
          disabled={loading}
          onClick={() => signIn("dept@demo.com", DEMO_PASSWORD, "/department")}
          className="rounded-sm border border-ink bg-white px-4 py-2 font-medium disabled:opacity-50"
        >
          Login as Department (demo)
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-sm border border-line bg-white px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-sm border border-line bg-white px-3 py-2"
        />
        <button
          disabled={loading}
          onClick={() => signIn(email, password, "/")}
          className="rounded-sm bg-ink px-4 py-2 text-white disabled:opacity-50"
        >
          Login
        </button>
        {error && <p className="text-sm text-delayed">{error}</p>}
      </div>
    </main>
  );
}