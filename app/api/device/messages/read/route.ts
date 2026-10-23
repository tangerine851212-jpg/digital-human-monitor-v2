import { NextResponse } from "next/server";

import { markFamilyMessagesAsRead } from "@/lib/monitor-data";
import { requireDeviceAuth } from "@/lib/device-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        messageIds?: unknown;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "deviceUuid 是必填项。" },
      { status: 400 },
    );
  }

  const messageIds = Array.isArray(body.messageIds)
    ? body.messageIds.filter(
        (messageId): messageId is string => typeof messageId === "string",
      )
    : undefined;

  try {
    await requireDeviceAuth(request, body.deviceUuid);
    await markFamilyMessagesAsRead(body.deviceUuid, messageIds);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "更新留言状态失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
