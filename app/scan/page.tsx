import Link from "next/link";

import { PanelShell } from "@/components/panel-shell";
import { ScanClient } from "@/components/scan-client";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const caregiver = await requireCaregiverSession("/scan");
  return (
    <PanelShell currentPath="/scan" title="扫码绑定" caregiverLabel={getCaregiverDisplayName(caregiver)} backHref="/devices">
      <div className="scan-panel"><ScanClient /></div>
      <section className="card card-pad" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
        <p style={{ margin: 0 }}>1. 让长辈打开陪伴屏上的「家人连接」页面。</p>
        <p style={{ margin: "4px 0 0" }}>2. 将镜头对准屏幕上的二维码，保持一两秒。</p>
        <p style={{ margin: "4px 0 0" }}>3. 识别成功后自动完成绑定并返回设备页。</p>
      </section>
      <Link href="/devices" className="btn block">没有摄像头？改用设备码连接</Link>
    </PanelShell>
  );
}
