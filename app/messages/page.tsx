import Link from "next/link";
import { PenLine } from "lucide-react";

import { PanelShell } from "@/components/panel-shell";
import { getCaregiverMessages } from "@/lib/caregiver-panel";
import { formatDateTime, getDeviceName, getMessageHref, getMessageStatusLabel, truncateText } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const caregiver = await requireCaregiverSession("/messages");
  const { messages, unreadIncomingCount } = await getCaregiverMessages(caregiver.id);
  const filter = (await searchParams).filter === "out" ? "out" : "in";
  const items = messages.filter((m) => filter === "in" ? m.direction === "ELDER_TO_FAMILY" : m.direction === "FAMILY_TO_ELDER");

  return (
    <PanelShell currentPath="/messages" title="留言板" caregiverLabel={getCaregiverDisplayName(caregiver)} unreadCount={unreadIncomingCount}
      actions={<Link href="/devices" className="btn primary small"><PenLine size={14}/>写留言</Link>}>
      <div className="segment">
        <Link href="/messages?filter=in" className={filter === "in" ? "active" : ""}>收到 · {unreadIncomingCount} 未读</Link>
        <Link href="/messages?filter=out" className={filter === "out" ? "active" : ""}>发出</Link>
      </div>
      <section className="card">
        {items.length ? items.map((message) => (
          <Link key={message.id} href={getMessageHref(message.publicId)} className="list-row">
            <span className="dot" style={{ background: message.readAt ? "transparent" : "var(--accent)" }} />
            <span className="row-main">
              <span className="row-meta" style={{ marginTop: 0 }}>
                <strong style={{ color: "var(--ink-soft)" }}>{getDeviceName(message.elderDevice.displayName)}</strong>
                {message.importance !== "NORMAL" ? <span className="tag">重要</span> : null}
                <span style={{ marginLeft: "auto", color: "var(--muted-light)" }}>{formatDateTime(message.createdAt)}</span>
              </span>
              <span className="row-title" style={{ marginTop: 4, fontWeight: message.readAt ? 400 : 600 }}>{truncateText(message.content, 82)}</span>
              <span className="row-meta">#{message.publicId} · {getMessageStatusLabel(message)}</span>
            </span>
          </Link>
        )) : <div className="empty">这一侧暂时还没有留言。</div>}
      </section>
    </PanelShell>
  );
}
