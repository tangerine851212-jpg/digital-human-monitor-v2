import Link from "next/link";
import { ChevronRight, Smartphone } from "lucide-react";

import { BindDeviceForm } from "@/components/dashboard-actions";
import { PanelShell } from "@/components/panel-shell";
import { getCaregiverDevices } from "@/lib/caregiver-panel";
import { formatDateTime, getDeviceName } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const caregiver = await requireCaregiverSession("/devices");
  const devices = await getCaregiverDevices(caregiver.id);
  const unread = devices.reduce((n, d) => n + d.elderUnreadCount, 0);

  return (
    <PanelShell currentPath="/devices" title="我的设备" caregiverLabel={getCaregiverDisplayName(caregiver)} unreadCount={unread}
      actions={<Link href="/scan" className="btn small">扫码绑定</Link>}>
      <section className="card">
        {devices.length ? devices.map((binding) => (
          <Link key={binding.id} href={`/devices/${binding.elderDevice.deviceUuid}`} className="list-row" style={{ alignItems: "center", gap: 12 }}>
            <span className="device-icon"><Smartphone size={19} strokeWidth={1.8} /></span>
            <span className="row-main">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="row-title">{getDeviceName(binding.alias, binding.elderDevice.displayName)}</span>
                <span className={`dot ${binding.elderDevice.lastSeenAt ? "online" : "offline"}`} style={{ marginTop: 0 }} />
              </span>
              <span className="row-meta">{formatDateTime(binding.elderDevice.lastSeenAt)} · 留言 {binding.elderDevice._count.messages} · 对话 {binding.elderDevice._count.conversationTurns} · 服务 {binding.elderDevice._count.toolCalls}</span>
            </span>
            {binding.elderUnreadCount > 0 ? <span className="nav-badge" style={{ position: "static" }}>{binding.elderUnreadCount}</span> : null}
            <ChevronRight size={14} color="var(--muted-light)" />
          </Link>
        )) : <div className="empty">还没有连接设备，扫描陪伴屏上的二维码即可添加。</div>}
      </section>

      <BindDeviceForm />

      <details className="card">
        <summary className="list-row" style={{ alignItems: "center", fontSize: 13, fontWeight: 600, listStyle: "none" }}>
          <span style={{ flex: 1 }}>如何连接设备？</span><span className="row-meta" style={{ margin: 0 }}>展开</span>
        </summary>
        <div className="card-pad" style={{ borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
          <p>1. 打开陪伴屏上的「家人连接」页面。</p>
          <p>2. 扫描二维码，或把设备码粘贴到上方输入框。</p>
          <p>3. 连接后即可收到留言、对话与使用动态。</p>
        </div>
      </details>
    </PanelShell>
  );
}
