import { NextResponse } from "next/server";

import { sendCaregiverTestPush } from "@/lib/push";
import { getCaregiverDisplayName, getCaregiverSession } from "@/lib/session";

export async function POST() {
  const caregiver = await getCaregiverSession();

  if (!caregiver) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  try {
    const result = await sendCaregiverTestPush({
      caregiverId: caregiver.id,
      caregiverLabel: getCaregiverDisplayName(caregiver),
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "测试推送发送失败。",
      },
      { status: 400 },
    );
  }
}