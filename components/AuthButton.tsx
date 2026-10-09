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
      <Link href="/login" className="ml-auto rounded bg-black px-3 py-1 text-sm text-white">
        Login
      </Link>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <span className="text-gray-600">{email}</span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        }}
        className="rounded border px-3 py-1"
      >
        Logout
      </button>
    </div>
  );
}