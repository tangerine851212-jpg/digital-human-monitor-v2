import { AlertTriangle, CheckCircle2, HeartPulse, PhoneCall } from "lucide-react";

import { AlertActions, CheckInButton } from "@/components/family-guard-actions";
import { PanelShell } from "@/components/panel-shell";
import { requireFamilyWorkspace } from "@/lib/family-page";
import { formatDateTime } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GuardPage() {
  const caregiver = await requireCaregiverSession("/guard");
  const workspace = await requireFamilyWorkspace(caregiver.id);
  const elder = workspace.elderProfile;
  const device = elder.elderDevice;
  const lastSeenAt = device.lastSeenAt;
  const isOnline = Boolean(lastSeenAt);
  const openAlerts = workspace.alerts.filter((alert) => alert.status === "OPEN" || alert.status === "ACKNOWLEDGED");
  const today = new Date().toDateString();
  const todayDoses = workspace.medicationPlans.flatMap((plan) => plan.doses).filter((dose) => dose.scheduledFor.toDateString() === today);
  const doneDoses = todayDoses.filter((dose) => dose.status === "TAKEN").length;
  const openTasks = workspace.tasks.filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED");
  const pendingCheckIns = workspace.checkIns.filter((checkIn) => checkIn.status === "PENDING");
  const dutyNames = workspace.memberships
    .filter((membership) => membership.emergencyPush)
    .map((membership) => membership.caregiver.nickname || membership.caregiver.username || "家人");

  return (
    <PanelShell
      currentPath="/guard"
      title="家庭守护"
      description={`${elder.preferredName} · 风险线索不是医疗诊断`}
      caregiverLabel={getCaregiverDisplayName(caregiver)}
      caregiverId={caregiver.id}
    >
      <section className="elder-status">
        <div className="elder-status-main">
          <span className="elder-avatar">{elder.preferredName.slice(0, 1)}</span>
          <span className="row-main">
            <span className="elder-name">
              {elder.preferredName}
              <span className={`dot ${isOnline ? "online" : "offline"}`} style={{ marginTop: 0 }} />
              <span className="online-label" style={{ color: isOnline ? "var(--success-ink)" : "var(--muted-light)" }}>
                {isOnline ? "在线" : "离线"}
              </span>
            </span>
            <span className="elder-meta">
              {isOnline ? `最近与数字人互动 · ${device.displayName || "长辈终端"}` : `最近在线：${formatDateTime(lastSeenAt)} · ${device.displayName || "长辈终端"}`}
            </span>
          </span>
        </div>
        <CheckInButton deviceUuid={device.deviceUuid} />
      </section>

      <section className="metric-grid">
        <div className="metric-card accent"><strong>{openAlerts.length}</strong><span>待处理提醒</span></div>
        <div className="metric-card"><strong>{doneDoses}/{todayDoses.length}</strong><span>今日用药</span></div>
        <div className="metric-card"><strong>{openTasks.length}</strong><span>照护事项</span></div>
        <div className="metric-card"><strong>{pendingCheckIns.length}</strong><span>待报平安</span></div>
      </section>

      <section>
        <div className="section-title"><h2>风险提醒</h2><span>人工确认后再处置</span></div>
        <div className="alert-list">
          {workspace.alerts.length ? workspace.alerts.map((alert) => (
            <article id={`alert-${alert.id}`} key={alert.id} className={`alert-card${alert.level === "RED" ? " red" : ""}`}>
              <div className="timeline-top">
                <span className={`alert-title${alert.level === "RED" ? " red" : ""}`}>
                  <AlertTriangle size={15} strokeWidth={2} />{alert.title}
                </span>
                <span className="timeline-time">{formatDateTime(alert.createdAt)}</span>
              </div>
              <p className="timeline-body">{alert.summary}</p>
              <p className="row-meta">{alert.claimedBy ? `已由 ${alert.claimedBy.nickname || alert.claimedBy.username || "家人"} 接手` : "尚未认领"}</p>
              <AlertActions alertId={alert.id} status={alert.status} />
            </article>
          )) : (
            <div className="empty"><CheckCircle2 size={26} /><br />当前没有待处理的风险提醒</div>
          )}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>今日状态</h2></div>
        <div className="card">
          <article className="timeline-item">
            <div className="timeline-top"><HeartPulse size={15} />设备最近在线<span className="timeline-time">{formatDateTime(lastSeenAt)}</span></div>
            <p className="timeline-body">仅根据终端在线和主动交互记录展示，不代表生命体征状态。</p>
          </article>
          <article className="timeline-item">
            <div className="timeline-top"><PhoneCall size={15} />家庭值守</div>
            <p className="timeline-body">{dutyNames.length ? `${dutyNames.join("、")}已开启紧急推送` : "尚未设置家庭值守"}</p>
          </article>
        </div>
      </section>
    </PanelShell>
  );
}
