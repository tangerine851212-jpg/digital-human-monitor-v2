import { JoinFamilyButton } from "@/components/family-guard-actions";
import { requireCaregiverSession } from "@/lib/page-auth";

export default async function JoinFamilyPage({ searchParams }: PageProps<"/family/join">) {
  const token = String((await searchParams).token || "");
  await requireCaregiverSession(`/family/join?token=${encodeURIComponent(token)}`);
  return <main className="app-frame"><div className="app-content app-stack"><section className="card card-pad" style={{ marginTop: 48 }}><h1 style={{ margin: 0 }}>加入家庭守护圈</h1><p className="timeline-body">加入后，你将根据邀请角色参与长辈的家庭动态和共同照护。</p><JoinFamilyButton token={token} /></section></div></main>;
}
