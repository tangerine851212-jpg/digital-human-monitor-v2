import { NextResponse } from "next/server";
import { createFamilyInvitation } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const result = await createFamilyInvitation(caregiver.id, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创建邀请失败。" }, { status: 400 }); }
}
