import { NextResponse } from "next/server";

import { createBindUrl, ensureDeviceRegistration } from "@/lib/monitor-data";
import { createDeviceToken, hashDeviceToken } from "@/lib/device-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        displayName?: string;
        appVersion?: string;
        deviceToken?: string;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "deviceUuid 是必填项。" },
      { status: 400 },
    );
  }

  try {
    const device = await ensureDeviceRegistration({
      deviceUuid: body.deviceUuid,
      displayName:
        typeof body.displayName === "string" ? body.displayName : undefined,
      appVersion:
        typeof body.appVersion === "string" ? body.appVersion : undefined,
    });
    const suppliedToken = typeof body.deviceToken === "string" ? body.deviceToken.trim() : "";
    const tokenMatches = suppliedToken && device.deviceTokenHash === hashDeviceToken(suppliedToken);
    if (device.deviceTokenHash && !tokenMatches) {
      return NextResponse.json({ error: "设备认证失败，不能覆盖已注册设备。" }, { status: 401 });
    }
    const deviceToken = tokenMatches ? suppliedToken : createDeviceToken();
    if (!device.deviceTokenHash) {
      await prisma.elderDevice.update({ where: { id: device.id }, data: { deviceTokenHash: hashDeviceToken(deviceToken) } });
    }

    return NextResponse.json({
      deviceUuid: device.deviceUuid,
      bindUrl: createBindUrl(device.deviceUuid),
      deviceToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "设备注册失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
