import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateText } from "@/lib/gemini";
import { buildPrompt, type AiKind } from "@/lib/ai-prompts";

const KINDS: AiKind[] = ["notice_summary", "delay_draft", "report_summary"];

export async function POST(request: Request) {
  // only logged-in users can call this
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please log in first." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const kind = body.kind as AiKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ ok: false, error: "Unknown kind." }, { status: 400 });
  }

  const project = body.project ?? {};
  if (JSON.stringify(project).length > 4000) {
    return NextResponse.json({ ok: false, error: "Project text is too long." }, { status: 400 });
  }
  const reports: string[] = Array.isArray(body.reports)
    ? body.reports.slice(0, 30).map((r: unknown) => String(r).slice(0, 300))
    : [];

  const { prompt, json } = buildPrompt(kind, project, reports);
  const raw = await generateText(prompt, json);

  // fallback: the caller shows the plain project text instead
  if (!raw) {
    return NextResponse.json({ ok: false, fallback: true, error: "AI is unavailable right now." });
  }

  if (json) {
    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({ ok: true, kind, result: { en: parsed.en, ta: parsed.ta } });
    } catch {
      return NextResponse.json({ ok: false, fallback: true, error: "AI returned an unreadable answer." });
    }
  }

  return NextResponse.json({ ok: true, kind, result: { text: raw } });
}