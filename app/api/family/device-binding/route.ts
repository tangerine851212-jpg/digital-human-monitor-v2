import { NextResponse } from "next/server";

import {
  unbindDeviceFromCaregiver,
  updateCaregiverDeviceAlias,
} from "@/lib/monitor-data";
import { getDeviceName } from "@/lib/panel-format";
import { getCaregiverSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        alias?: string | null;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json({ error: "请先提供目标设备。" }, { status: 400 });
  }

  try {
    const caregiver = await getCaregiverSession();

    if (!caregiver) {
      return NextResponse.json({ error: "请先登录账号。" }, { status: 401 });
    }

    const binding = await updateCaregiverDeviceAlias({
      caregiverId: caregiver.id,
      rawDeviceValue: body.deviceUuid,
      alias: typeof body.alias === "string" || body.alias === null ? body.alias : undefined,
    });

    return NextResponse.json({
      ok: true,
      alias: binding.alias,
      deviceName: getDeviceName(binding.alias, binding.elderDevice.displayName),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "设备别名保存失败。",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json({ error: "请先提供目标设备。" }, { status: 400 });
  }

  try {
    const caregiver = await getCaregiverSession();

    if (!caregiver) {
      return NextResponse.json({ error: "请先登录账号。" }, { status: 401 });
    }

    const result = await unbindDeviceFromCaregiver(caregiver.id, body.deviceUuid);

    return NextResponse.json({
      ok: true,
      deviceUuid: result.deviceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "解绑设备失败。",
      },
      { status: 400 },
    );
  }
}