import { NextResponse } from "next/server";
import { createMedicationPlan } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const plan = await createMedicationPlan(caregiver.id, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, plan });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创建用药计划失败。" }, { status: 400 }); }
}
