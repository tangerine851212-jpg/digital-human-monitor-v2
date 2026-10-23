import { NextResponse } from "next/server";
import { acceptFamilyInvitation } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录后接受邀请。" }, { status: 401 });
    const body = await request.json().catch(() => ({})) as { token?: string };
    const circle = await acceptFamilyInvitation(caregiver.id, body.token || "");
    return NextResponse.json({ ok: true, circleId: circle.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "加入家庭失败。" }, { status: 400 }); }
}
