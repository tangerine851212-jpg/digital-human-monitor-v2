import { NextResponse } from "next/server";
import { createFamilyMemo } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const memo = await createFamilyMemo(caregiver.id, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, memo });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败。" }, { status: 400 }); }
}
