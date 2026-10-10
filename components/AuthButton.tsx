"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthButton() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <Link href="/login" className="ml-auto rounded-sm bg-ink px-3 py-1 text-sm font-medium text-white">
        Login
      </Link>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span className="text-muted">{email}</span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        }}
        className="rounded-sm border border-ink px-3 py-1 hover:bg-ink hover:text-white"
      >
        Logout
      </button>
    </div>
  );
}