import { ChevronRight } from "lucide-react";

import { PanelShell } from "@/components/panel-shell";
import { PwaControls } from "@/components/pwa-controls";
import { getCaregiverSettingsOverview } from "@/lib/caregiver-panel";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const caregiver = await requireCaregiverSession("/settings");
  const overview = await getCaregiverSettingsOverview(caregiver.id);
  const name = getCaregiverDisplayName(caregiver);

  return (
    <PanelShell currentPath="/settings" title="我的" description="账号、通知与设备" caregiverLabel={name} caregiverId={caregiver.id}>
      <section className="card settings-profile">
        <span className="avatar">{name.slice(-1)}</span>
        <span className="row-main">
          <strong style={{ display: "block", fontSize: 15.5 }}>{name}</strong>
          <span className="row-meta">已绑定 {overview.deviceCount} 台设备 · {overview.pushSubscriptionCount} 台设备已开启提醒</span>
        </span>
        <ChevronRight className="chevron" size={16} strokeWidth={2} />
      </section>

      <section>
        <div className="section-title"><h2>通知与设备</h2></div>
        <PwaControls deviceCount={overview.deviceCount} />
      </section>

      <form action="/api/account/logout" method="post" className="card">
        <button type="submit" className="settings-row" style={{ justifyContent: "center", color: "var(--danger)", fontSize: 14, fontWeight: 600 }}>退出登录</button>
      </form>
      <p className="muted-note" style={{ textAlign: "center" }}>安智伴 · AI 数字人陪护 · 家属端 v2</p>
    </PanelShell>
  );
}
