import { NextResponse } from "next/server";

import { createFamilyMessageFromCaregiver } from "@/lib/monitor-data";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        content?: string;
        importance?: string;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "请先提供目标老人设备码。" },
      { status: 400 },
    );
  }

  if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json(
      { error: "留言内容不能为空。" },
      { status: 400 },
    );
  }

  try {
    const caregiver = await getCaregiverSession();

    if (!caregiver) {
      return NextResponse.json(
        { error: "请先登录账号后再发送留言。" },
        { status: 401 },
      );
    }

    const message = await createFamilyMessageFromCaregiver({
      caregiverId: caregiver.id,
      rawDeviceValue: body.deviceUuid,
      content: body.content,
      importance: typeof body.importance === "string" ? body.importance : undefined,
    });

    return NextResponse.json({
      ok: true,
      messageId: message.id,
      publicId: message.publicId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "留言发送失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}