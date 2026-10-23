import Link from "next/link";

import { PanelShell } from "@/components/panel-shell";
import { getCaregiverActivity } from "@/lib/caregiver-panel";
import { formatDateTime, getConversationRoleLabel, getDeviceName, getUsageLabel, truncateText } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const caregiver = await requireCaregiverSession("/activity");
  const { usageEvents, conversationTurns, toolCalls } = await getCaregiverActivity(caregiver.id);
  const rawTab = (await searchParams).tab;
  const tab = rawTab === "chat" || rawTab === "tool" ? rawTab : "usage";

  const rows = tab === "usage"
    ? usageEvents.map((item) => ({ id: item.id, top: getDeviceName(item.elderDevice.displayName), time: formatDateTime(item.createdAt), body: getUsageLabel(item.eventType) }))
    : tab === "chat"
      ? conversationTurns.map((item) => ({ id: item.id, top: getConversationRoleLabel(item.role), time: formatDateTime(item.createdAt), body: truncateText(item.content, 180) }))
      : toolCalls.map((item) => ({ id: item.id, top: item.toolName, time: formatDateTime(item.createdAt), body: truncateText(item.outputText || item.argumentsJson, 180) }));

  return (
    <PanelShell currentPath="/activity" title="陪伴动态" caregiverLabel={getCaregiverDisplayName(caregiver)} backHref="/">
      <div className="segment">
        <Link href="/activity?tab=usage" className={tab === "usage" ? "active" : ""}>使用</Link>
        <Link href="/activity?tab=chat" className={tab === "chat" ? "active" : ""}>对话</Link>
        <Link href="/activity?tab=tool" className={tab === "tool" ? "active" : ""}>智能服务</Link>
      </div>
      <section className="card">
        {rows.length ? rows.map((row) => (
          <article key={row.id} className="timeline-item">
            <div className="timeline-top" style={{ color: tab === "tool" ? "var(--accent)" : undefined }}>{row.top}<span className="timeline-time">{row.time}</span></div>
            <p className="timeline-body">{row.body}</p>
          </article>
        )) : <div className="empty">这个分类暂时还没有动态。</div>}
      </section>
      <p className="muted-note">「智能服务」记录数字人助理自主调用的工具，包括照护知识查询与双向留言等。</p>
    </PanelShell>
  );
}
