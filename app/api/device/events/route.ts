import { CheckInStatus, MedicationDoseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireDeviceAuth } from "@/lib/device-auth";
import { respondCheckIn, updateMedicationDose } from "@/lib/family-guard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const deviceUuid = typeof body.deviceUuid === "string" ? body.deviceUuid : "";
  try {
    await requireDeviceAuth(request, deviceUuid);
    if (body.type === "MEDICATION") {
      const allowed = Object.values(MedicationDoseStatus);
      const status = allowed.includes(body.status as MedicationDoseStatus) ? body.status as MedicationDoseStatus : MedicationDoseStatus.NEEDS_FAMILY_CONFIRMATION;
      const dose = await updateMedicationDose(deviceUuid, String(body.doseId || ""), status, body.note, Number(body.snoozeMinutes || 10));
      return NextResponse.json({ ok: true, dose });
    }
    if (body.type === "CHECK_IN") {
      const status = body.status === CheckInStatus.SAFE
        ? CheckInStatus.SAFE
        : body.status === CheckInStatus.DECLINED
          ? CheckInStatus.DECLINED
          : CheckInStatus.NEEDS_CONTACT;
      const checkIn = await respondCheckIn(deviceUuid, String(body.checkInId || ""), status, body.responseText);
      return NextResponse.json({ ok: true, checkIn });
    }
    throw new Error("不支持的设备事件类型。");
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存照护反馈失败。" }, { status: 400 }); }
}
