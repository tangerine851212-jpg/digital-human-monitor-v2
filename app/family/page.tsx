import { FamilyPostForm, InviteMemberForm } from "@/components/family-guard-actions";
import { PanelShell } from "@/components/panel-shell";
import { requireFamilyWorkspace } from "@/lib/family-page";
import { formatDateTime } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

const roleLabel = { ADMIN: "管理员", CAREGIVER: "照护成员", CARING: "关怀成员" } as const;
const avatarStyles = [
  { background: "rgba(192,90,30,.1)", color: "var(--accent)" },
  { background: "rgba(101,118,90,.12)", color: "var(--olive)" },
  { background: "rgba(33,30,26,.06)", color: "var(--muted)" },
];

export default async function FamilyPage() {
  const caregiver = await requireCaregiverSession("/family");
  const workspace = await requireFamilyWorkspace(caregiver.id);
  const deviceUuid = workspace.elderProfile.elderDevice.deviceUuid;

  return (
    <PanelShell
      currentPath="/family"
      title={workspace.name}
      description={`${workspace.memberships.length} 位家人共同参与`}
      caregiverLabel={getCaregiverDisplayName(caregiver)}
      caregiverId={caregiver.id}
    >
      <FamilyPostForm deviceUuid={deviceUuid} />

      <section>
        <div className="section-title"><h2>家庭动态</h2></div>
        <div className="card">
          {workspace.posts.length ? workspace.posts.map((post) => (
            <article key={post.id} className="timeline-item">
              <div className="timeline-top">
                {post.elderAuthored ? `${workspace.elderProfile.preferredName}通过安智伴说` : post.author?.nickname || post.author?.username || "家里人"}
                <span className="timeline-time">{formatDateTime(post.createdAt)}</span>
              </div>
              <p className="timeline-body">{post.content}</p>
              <span className="tag" style={{ marginTop: 8 }}>
                {post.visibility === "FAMILY_ONLY" ? "仅家人" : post.visibility === "ELDER_ONLY" ? "只给长辈" : "全家可见"}
              </span>
            </article>
          )) : <div className="empty">发出第一条家庭动态，让关心流动起来。</div>}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>家庭成员</h2></div>
        <div className="card">
          {workspace.memberships.map((member, index) => {
            const name = member.caregiver.nickname || member.caregiver.username || "家庭成员";
            return (
              <div key={member.id} className="list-row" style={{ alignItems: "center" }}>
                <span className="member-avatar" style={avatarStyles[index % avatarStyles.length]}>{name.slice(-1)}</span>
                <span className="row-main">
                  <span className="row-title">{name}</span>
                  <span className="row-meta">
                    {member.relationLabel || "家人"}{member.dutyOrder ? ` · 值守顺序 ${member.dutyOrder}` : ""}
                  </span>
                </span>
                <span className="member-role">{roleLabel[member.role]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>邀请家人</h2><span>链接 24 小时有效</span></div>
        <InviteMemberForm deviceUuid={deviceUuid} />
      </section>
    </PanelShell>
  );
}
