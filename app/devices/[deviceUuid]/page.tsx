import Link from "next/link";
import { notFound } from "next/navigation";

import { ManageDeviceForm, SendMessageForm } from "@/components/dashboard-actions";
import { PanelShell } from "@/components/panel-shell";
import { getCaregiverDeviceDetail } from "@/lib/caregiver-panel";
import { formatDateTime, getConversationRoleLabel, getDeviceName, getMessageHref, getUsageLabel, truncateText } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DeviceDetailPage({ params, searchParams }: PageProps<"/devices/[deviceUuid]">) {
  const { deviceUuid } = await params;
  const caregiver = await requireCaregiverSession(`/devices/${deviceUuid}`);
  const binding = await getCaregiverDeviceDetail(caregiver.id, deviceUuid);
  if (!binding) notFound();
  const rawTab = (await searchParams).tab;
  const tab = rawTab === "chat" || rawTab === "usage" ? rawTab : "msg";
  const messages = binding.elderDevice.messages;

  return (
    <PanelShell currentPath="/devices" title={getDeviceName(binding.alias, binding.elderDevice.displayName)} caregiverLabel={getCaregiverDisplayName(caregiver)} backHref="/devices"
      actions={<span className="row-meta" style={{ margin: 0 }}><span className="dot online" style={{ margin: 0 }} />{formatDateTime(binding.elderDevice.lastSeenAt)}</span>}>
      <section className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="stat accent"><strong>{binding.elderUnreadCount}</strong><span>新留言</span></div>
        <div className="stat"><strong>{binding.familyUnreadCount}</strong><span>待长辈听</span></div>
        <div className="stat"><strong>{binding.elderDevice._count.conversationTurns}</strong><span>陪伴对话</span></div>
      </section>

      <SendMessageForm deviceUuid={binding.elderDevice.deviceUuid} />

      <div className="segment">
        <Link href={`/devices/${deviceUuid}?tab=msg`} className={tab === "msg" ? "active" : ""}>留言</Link>
        <Link href={`/devices/${deviceUuid}?tab=chat`} className={tab === "chat" ? "active" : ""}>对话</Link>
        <Link href={`/devices/${deviceUuid}?tab=usage`} className={tab === "usage" ? "active" : ""}>使用</Link>
      </div>

      <section className="card">
        {tab === "msg" ? (messages.length ? messages.map((message) => (
          <Link key={message.id} href={getMessageHref(message.publicId)} className="timeline-item" style={{ display: "block" }}>
            <div className="timeline-top" style={{ color: message.direction === "FAMILY_TO_ELDER" ? "var(--accent)" : undefined }}>{message.direction === "FAMILY_TO_ELDER" ? "我发出的问候" : "长辈捎来的话"}<span className="timeline-time">{formatDateTime(message.createdAt)}</span></div>
            <p className="timeline-body">{truncateText(message.content, 126)}</p>
          </Link>
        )) : <div className="empty">还没有留言。</div>) : tab === "chat" ? (binding.elderDevice.conversationTurns.length ? binding.elderDevice.conversationTurns.map((turn) => (
          <article key={turn.id} className="timeline-item"><div className="timeline-top">{getConversationRoleLabel(turn.role)}<span className="timeline-time">{formatDateTime(turn.createdAt)}</span></div><p className="timeline-body">{truncateText(turn.content, 150)}</p></article>
        )) : <div className="empty">还没有聊天记录。</div>) : (binding.elderDevice.usageEvents.length ? binding.elderDevice.usageEvents.map((event) => (
          <article key={event.id} className="timeline-item"><div className="timeline-top">使用记录<span className="timeline-time">{formatDateTime(event.createdAt)}</span></div><p className="timeline-body">{getUsageLabel(event.eventType)}</p></article>
        )) : <div className="empty">暂时还没有使用记录。</div>)}
      </section>

      <details className="device-manage"><summary className="btn block">设备设置</summary><ManageDeviceForm deviceUuid={binding.elderDevice.deviceUuid} initialAlias={binding.alias} deviceLabel={getDeviceName(binding.elderDevice.displayName)} /></details>
    </PanelShell>
  );
}
