"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/reports/client";

export function useIsDept(userId: string | null) {
  const [isDept, setIsDept] = useState(false);
  useEffect(() => {
    if (!userId) { setIsDept(false); return; }
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle().then(({ data }) => setIsDept(data?.role === "department"));
  }, [userId]);
  return isDept;
}
