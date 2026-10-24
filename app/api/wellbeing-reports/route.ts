import { NextResponse } from "next/server";

import { getFamilyWorkspace } from "@/lib/family-guard";
import { getCaregiverSession } from "@/lib/session";
import {
  generateWellbeingReport,
  WellbeingReportError,
} from "@/lib/wellbeing-report";

export const maxDuration = 120;

export async function POST() {
  const caregiver = await getCaregiverSession();
  if (!caregiver) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  try {
    const workspace = await getFamilyWorkspace(caregiver.id);
    if (
      workspace.elderProfile.consentSetting &&
      !workspace.elderProfile.consentSetting.shareTranscripts
    ) {
      return NextResponse.json(
        { error: "当前未授权使用对话生成陪伴报告。" },
        { status: 403 },
      );
    }

    const report = await generateWellbeingReport({
      elderDeviceId: workspace.elderProfile.elderDeviceId,
      familyCircleId: workspace.id,
      generatedById: caregiver.id,
    });

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      createdAt: report.createdAt,
    });
  } catch (error) {
    if (error instanceof WellbeingReportError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Wellbeing report generation failed", error);
    return NextResponse.json(
      { error: "报告生成失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
