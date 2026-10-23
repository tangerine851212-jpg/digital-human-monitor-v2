import { NextResponse } from "next/server";
import { updateAlert } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function PATCH(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const alert = await updateAlert(caregiver.id, String(body.alertId || ""), String(body.action || ""), body.note);
    return NextResponse.json({ ok: true, alert });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新提醒失败。" }, { status: 400 }); }
}
