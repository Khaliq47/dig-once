export type AiKind = "notice_summary" | "delay_draft" | "report_summary";

export interface ProjectFacts {
  title?: string;
  department?: string;
  contractor?: string;
  purpose?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  delay_reason?: string;
}

const RULES =
  "Use only the facts given. Do not invent dates, names, amounts or reasons. " +
  "Write in plain language that any resident can understand. No headings and no bullet points.";

export function buildPrompt(
  kind: AiKind,
  project: ProjectFacts,
  reports: string[] = []
): { prompt: string; json: boolean } {
  const facts = JSON.stringify(project);

  if (kind === "notice_summary") {
    return {
      json: true,
      prompt:
        `${RULES}\n` +
        `Summarise this public works project in 2 to 3 short sentences. ` +
        `Return JSON with exactly two keys: "en" (English) and "ta" (Tamil, simple everyday words).\n` +
        `Project facts: ${facts}`,
    };
  }

  if (kind === "delay_draft") {
    return {
      json: false,
      prompt:
        `${RULES}\n` +
        `Draft a short, polite public explanation (2 to 3 sentences) of why this project is delayed ` +
        `and that residents will be updated. If the delay reason is missing, say the department is ` +
        `reviewing the cause. This is a draft that the department will review before publishing.\n` +
        `Project facts: ${facts}`,
    };
  }

  // report_summary: the count comes from our code, so the model can't get it wrong
  return {
    json: false,
    prompt:
      `${RULES}\n` +
      `There are ${reports.length} resident reports about this project. ` +
      `Summarise in 1 to 2 sentences what residents are mainly reporting, and mention the number ${reports.length}.\n` +
      `Project facts: ${facts}\n` +
      `Reports:\n${reports.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
  };
}