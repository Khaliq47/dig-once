"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/reports/client";

/** Current user id + access token (null when logged out). */
export function useSession() {
  const [state, setState] = useState<{ userId: string | null; token: string | null; loading: boolean }>(
    { userId: null, token: null, loading: true }
  );
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setState({ userId: data.session?.user.id ?? null, token: data.session?.access_token ?? null, loading: false })
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setState({ userId: s?.user.id ?? null, token: s?.access_token ?? null, loading: false })
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}
