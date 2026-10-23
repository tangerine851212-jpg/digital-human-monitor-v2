import { NextResponse } from "next/server";
import { createCheckIn } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const checkIn = await createCheckIn(caregiver.id, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, checkIn });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "发起报平安失败。" }, { status: 400 }); }
}
