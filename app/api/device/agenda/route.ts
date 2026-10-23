import { NextResponse } from "next/server";
import { requireDeviceAuth } from "@/lib/device-auth";
import { getDeviceAgenda } from "@/lib/family-guard";

export async function GET(request: Request) {
  const deviceUuid = new URL(request.url).searchParams.get("deviceUuid") || "";
  try {
    await requireDeviceAuth(request, deviceUuid);
    const agenda = await getDeviceAgenda(deviceUuid);
    return NextResponse.json({
      circleName: agenda.circle?.name || null,
      posts: agenda.posts.map((post) => ({ id: post.id, content: post.content, authorName: post.author?.nickname || post.author?.username || "家里人", createdAt: post.createdAt })),
      memos: agenda.memos.map((memo) => ({ id: memo.id, title: memo.title, content: memo.content, priority: memo.priority })),
      doses: agenda.doses.map((dose) => ({ id: dose.id, scheduledFor: dose.scheduledFor, status: dose.status, name: dose.medicationPlan.name, dosage: dose.medicationPlan.dosage, instructions: dose.medicationPlan.instructions })),
      checkIns: agenda.checkIns,
    });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "读取今日照护事项失败。" }, { status: 401 }); }
}
