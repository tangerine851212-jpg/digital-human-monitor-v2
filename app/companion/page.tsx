import { ChevronRight, Heart, MessageCircle, MessagesSquare } from "lucide-react";
import Link from "next/link";

import { PanelShell } from "@/components/panel-shell";
import { getCaregiverMessages } from "@/lib/caregiver-panel";
import { requireFamilyWorkspace } from "@/lib/family-page";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CompanionPage() {
  const caregiver = await requireCaregiverSession("/companion");
  const [workspace, messageOverview] = await Promise.all([
    requireFamilyWorkspace(caregiver.id),
    getCaregiverMessages(caregiver.id),
  ]);

  return (
    <PanelShell
      currentPath="/companion"
      title="温暖陪伴"
      description="留言、回忆和每一次认真回应"
      caregiverLabel={getCaregiverDisplayName(caregiver)}
      unreadCount={messageOverview.unreadIncomingCount}
    >
      <section className="card">
        <Link className="list-row feature-row" href="/messages">
          <span className="feature-icon"><MessageCircle size={19} strokeWidth={1.8} /></span>
          <span className="row-main">
            <span className="row-title">双向留言</span>
            <span className="row-meta">家人问候由数字人口播，长辈口述实时送达</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {messageOverview.unreadIncomingCount > 0 ? <span className="count-badge">{messageOverview.unreadIncomingCount}</span> : null}
            <ChevronRight className="chevron" size={16} strokeWidth={2} />
          </span>
        </Link>
        <Link className="list-row feature-row" href="/activity">
          <span className="feature-icon olive"><MessagesSquare size={19} strokeWidth={1.8} /></span>
          <span className="row-main">
            <span className="row-title">陪伴动态</span>
            <span className="row-meta">查看数字人对话和智能服务记录</span>
          </span>
          <ChevronRight className="chevron" size={16} strokeWidth={2} />
        </Link>
        <div className="list-row feature-row feature-disabled">
          <span className="feature-icon muted"><Heart size={19} strokeWidth={1.8} /></span>
          <span className="row-main">
            <span className="row-title">家庭记忆册</span>
            <span className="row-meta">收藏长辈的语音与照片故事</span>
          </span>
          <span className="member-role">即将上线</span>
        </div>
      </section>

      <section>
        <div className="section-title"><h2>本周家庭连接</h2></div>
        <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat accent"><strong>{workspace.posts.length}</strong><span>家庭动态</span></div>
          <div className="stat"><strong>{workspace.memos.length}</strong><span>共同备忘</span></div>
          <div className="stat"><strong>{messageOverview.messages.length}</strong><span>留言往来</span></div>
        </div>
        <p className="muted-note" style={{ margin: "10px 2px 0" }}>数字人每天会把家人的问候念给长辈听，长辈的回应会同步到留言板。</p>
      </section>
    </PanelShell>
  );
}
