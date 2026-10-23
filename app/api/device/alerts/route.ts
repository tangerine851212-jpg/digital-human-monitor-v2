import { NextResponse } from "next/server";
import { requireDeviceAuth } from "@/lib/device-auth";
import { createSafetyAlertForDevice } from "@/lib/family-guard";
import { sendGuardAlertPush } from "@/lib/push";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const deviceUuid = typeof body.deviceUuid === "string" ? body.deviceUuid : "";
  try {
    await requireDeviceAuth(request, deviceUuid);
    const result = await createSafetyAlertForDevice(deviceUuid, body);
    if (!result.deduplicated) void sendGuardAlertPush(result.alert.id).catch(() => undefined);
    return NextResponse.json({ ok: true, alertId: result.alert.id, deduplicated: result.deduplicated });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创建风险提醒失败。" }, { status: 400 }); }
}
