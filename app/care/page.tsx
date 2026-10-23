import Link from "next/link";

import { MedicationForm, MemoForm, TaskActions, TaskForm } from "@/components/family-guard-actions";
import { PanelShell } from "@/components/panel-shell";
import { requireFamilyWorkspace } from "@/lib/family-page";
import { formatDateTime } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CarePage({ searchParams }: PageProps<"/care">) {
  const caregiver = await requireCaregiverSession("/care");
  const workspace = await requireFamilyWorkspace(caregiver.id);
  const tab = String((await searchParams).tab || "tasks");
  const deviceUuid = workspace.elderProfile.elderDevice.deviceUuid;

  return (
    <PanelShell currentPath="/care" title="共同照护" description="家人分工、老人确认、结果共享" caregiverLabel={getCaregiverDisplayName(caregiver)} caregiverId={caregiver.id}>
      <div className="segment">
        <Link className={tab === "tasks" ? "active" : ""} href="/care?tab=tasks">任务</Link>
        <Link className={tab === "medications" ? "active" : ""} href="/care?tab=medications">用药</Link>
        <Link className={tab === "memos" ? "active" : ""} href="/care?tab=memos">备忘</Link>
      </div>

      {tab === "medications" ? (
        <>
          <MedicationForm deviceUuid={deviceUuid} />
          <section>
            <div className="section-title"><h2>用药计划</h2><span>仅提醒与记录，不替代医嘱</span></div>
            <div className="card">
              {workspace.medicationPlans.length ? workspace.medicationPlans.map((plan) => (
                <article className="timeline-item" key={plan.id}>
                  <div className="timeline-top strong">{plan.name}<span className="tag">{plan.active ? "进行中" : "已暂停"}</span></div>
                  <p className="timeline-body">每次 {plan.dosage} · {JSON.parse(plan.timesJson).join("、")}{plan.instructions ? ` · ${plan.instructions}` : ""}</p>
                  <p className="row-meta">信息来源：{plan.source === "PRESCRIPTION" ? "医生处方" : plan.source === "PACKAGE_LABEL" ? "药盒标签" : "家属录入"}</p>
                </article>
              )) : <div className="empty">还没有用药计划。</div>}
            </div>
          </section>
        </>
      ) : tab === "memos" ? (
        <>
          <MemoForm deviceUuid={deviceUuid} />
          <section>
            <div className="section-title"><h2>家庭备忘录</h2></div>
            <div className="card">
              {workspace.memos.length ? workspace.memos.map((memo) => (
                <article className="timeline-item" key={memo.id}>
                  <div className="timeline-top strong">{memo.title}<span className="tag">{memo.priority === "PINNED" ? "长期置顶" : memo.priority === "IMPORTANT" ? "重要" : "普通"}</span></div>
                  <p className="timeline-body">{memo.content}</p>
                  <p className="row-meta">{memo.visibility === "FAMILY_ONLY" ? "仅家人可见" : "可由数字人告诉长辈"}</p>
                </article>
              )) : <div className="empty">还没有家庭备忘。</div>}
            </div>
          </section>
        </>
      ) : (
        <>
          <TaskForm deviceUuid={deviceUuid} />
          <section>
            <div className="section-title"><h2>照护交接</h2><span>认领后全家可见</span></div>
            <div className="card">
              {workspace.tasks.length ? workspace.tasks.map((task) => (
                <article className="timeline-item" key={task.id}>
                  <div className="timeline-top strong">{task.title}<span className="timeline-time">{task.dueAt ? formatDateTime(task.dueAt) : "未设期限"}</span></div>
                  <p className="timeline-body">{task.description || "等待家人认领"}</p>
                  <p className="row-meta">{task.assignedTo ? `负责人：${task.assignedTo.nickname || task.assignedTo.username || "家人"}` : "尚未认领"}</p>
                  <TaskActions taskId={task.id} status={task.status} />
                </article>
              )) : <div className="empty">还没有照护任务。</div>}
            </div>
          </section>
        </>
      )}
    </PanelShell>
  );
}
