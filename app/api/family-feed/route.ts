import { NextResponse } from "next/server";
import { createFamilyPost } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const post = await createFamilyPost(caregiver.id, body);
    return NextResponse.json({ ok: true, post });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "发布失败。" }, { status: 400 }); }
}
