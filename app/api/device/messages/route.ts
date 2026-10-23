import { NextRequest, NextResponse } from "next/server";

import { listFamilyMessagesForDevice } from "@/lib/monitor-data";
import { requireDeviceAuth } from "@/lib/device-auth";

export async function GET(request: NextRequest) {
  const rawDeviceValue =
    request.nextUrl.searchParams.get("deviceUuid") ||
    request.nextUrl.searchParams.get("device") ||
    "";
  const take = Number.parseInt(
    request.nextUrl.searchParams.get("take") || "12",
    10,
  );

  if (!rawDeviceValue) {
    return NextResponse.json(
      { error: "deviceUuid 是必填项。" },
      { status: 400 },
    );
  }

  try {
    await requireDeviceAuth(request, rawDeviceValue);
    const data = await listFamilyMessagesForDevice(rawDeviceValue, take);

    return NextResponse.json({
      deviceUuid: data.device.deviceUuid,
      unreadCount: data.unreadCount,
      summaryText: data.summaryText,
      messages: data.messages.map((message) => ({
        id: message.id,
        content: message.content,
        importance: message.importance,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
        deliveredAt: message.deliveredAt?.toISOString() || null,
        readAt: message.readAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "读取家属留言失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
