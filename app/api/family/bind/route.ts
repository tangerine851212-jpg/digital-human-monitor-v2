import { NextResponse } from "next/server";

import { bindDeviceToCaregiver, createBindUrl } from "@/lib/monitor-data";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "请先提供设备码或二维码链接。" },
      { status: 400 },
    );
  }

  try {
    const caregiver = await getCaregiverSession();

    if (!caregiver) {
      return NextResponse.json(
        { error: "请先登录账号后再绑定设备。" },
        { status: 401 },
      );
    }

    const device = await bindDeviceToCaregiver(caregiver.id, body.deviceUuid);

    return NextResponse.json({
      ok: true,
      deviceUuid: device.deviceUuid,
      bindUrl: createBindUrl(device.deviceUuid),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "绑定失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}