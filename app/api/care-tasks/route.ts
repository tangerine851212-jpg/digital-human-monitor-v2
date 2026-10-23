import { NextResponse } from "next/server";
import { createCareTask, updateCareTask } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const task = await createCareTask(caregiver.id, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, task });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创建任务失败。" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const caregiver = await getCaregiverSession();
    if (!caregiver) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const task = await updateCareTask(caregiver.id, String(body.taskId || ""), String(body.action || ""), body.note);
    return NextResponse.json({ ok: true, task });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新任务失败。" }, { status: 400 }); }
}
