import Link from "next/link";
import { notFound } from "next/navigation";

import { PanelShell } from "@/components/panel-shell";
import { getCaregiverMessageDetail } from "@/lib/caregiver-panel";
import { formatDateTime, getDeviceName, getMessageDirectionLabel, getMessageStatusLabel } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MessageDetailPage({ params }: PageProps<"/messages/[messageId]">) {
  const publicId = Number.parseInt((await params).messageId, 10);
  if (!Number.isFinite(publicId) || publicId <= 0) notFound();
  const caregiver = await requireCaregiverSession(`/messages/${publicId}`);
  const message = await getCaregiverMessageDetail(caregiver.id, publicId);
  if (!message) notFound();

  return (
    <PanelShell currentPath="/messages" title={`留言 #${message.publicId}`} caregiverLabel={getCaregiverDisplayName(caregiver)} backHref="/messages">
      <article className="card card-pad" style={{ paddingTop: 16, paddingBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="tag neutral">{getMessageDirectionLabel(message.direction)}</span>
          {message.importance !== "NORMAL" ? <span className="tag">重要</span> : null}
          <span className="tag neutral">{getMessageStatusLabel(message)}</span>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 17, lineHeight: 1.65 }}>{message.content}</p>
      </article>
      <section className="card">
        <div className="list-row"><span style={{ color: "var(--muted)" }}>所属设备</span><strong style={{ marginLeft: "auto", fontSize: 13 }}>{getDeviceName(message.elderDevice.displayName)}</strong></div>
        <div className="list-row"><span style={{ color: "var(--muted)" }}>时间</span><strong style={{ marginLeft: "auto", fontSize: 13 }}>{formatDateTime(message.createdAt)}</strong></div>
        <div className="list-row"><span style={{ color: "var(--muted)" }}>送达方式</span><strong style={{ marginLeft: "auto", fontSize: 13 }}>数字人口播</strong></div>
      </section>
      <Link href={`/devices/${message.elderDevice.deviceUuid}`} className="btn primary block">回一句问候</Link>
    </PanelShell>
  );
}
