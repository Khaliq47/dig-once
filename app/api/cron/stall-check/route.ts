import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/reports/server";


// Called two ways:
//  - Vercel cron (GET) with  Authorization: Bearer $CRON_SECRET
//  - the demo button (POST) with a logged-in department user's token
async function authorised(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;

  const admin = supabaseAdmin();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return false;
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "department";
}

async function run(req: Request) {
  if (!(await authorised(req))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { data, error } = await supabaseAdmin().rpc("run_stall_check");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flagged: data ?? [] });
}

export const GET = run;
export const POST = run;
