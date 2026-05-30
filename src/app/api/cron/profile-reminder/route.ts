import { NextResponse } from "next/server";
import { runProfileReminderCron } from "@/lib/email-triggers";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const sent = await runProfileReminderCron();
  return NextResponse.json({ success: true, data: { sent } });
}
