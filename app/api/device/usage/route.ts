import { UsageEventType } from "@prisma/client";
import { NextResponse } from "next/server";

import { recordUsageEvent } from "@/lib/monitor-data";
import { requireDeviceAuth } from "@/lib/device-auth";

function toUsageEventType(rawType: unknown) {
  switch (rawType) {
    case UsageEventType.APP_OPEN:
      return UsageEventType.APP_OPEN;
    case UsageEventType.SETTINGS_OPENED:
      return UsageEventType.SETTINGS_OPENED;
    case UsageEventType.AI_SESSION_STARTED:
      return UsageEventType.AI_SESSION_STARTED;
    case UsageEventType.AI_SESSION_ENDED:
      return UsageEventType.AI_SESSION_ENDED;
    case UsageEventType.CAMERA_ENABLED:
      return UsageEventType.CAMERA_ENABLED;
    case UsageEventType.CAMERA_DISABLED:
      return UsageEventType.CAMERA_DISABLED;
    default:
      return UsageEventType.TOOL_CALLED;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        eventType?: string;
        detailJson?: string;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "deviceUuid 是必填项。" },
      { status: 400 },
    );
  }

  if (!body.eventType || typeof body.eventType !== "string") {
    return NextResponse.json(
      { error: "eventType 是必填项。" },
      { status: 400 },
    );
  }

  try {
    await requireDeviceAuth(request, body.deviceUuid);
    await recordUsageEvent({
      deviceUuid: body.deviceUuid,
      eventType: toUsageEventType(body.eventType),
      detailJson: typeof body.detailJson === "string" ? body.detailJson : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "使用记录保存失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
