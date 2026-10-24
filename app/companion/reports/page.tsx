import { AlertTriangle, HeartPulse, Lightbulb } from "lucide-react";

import { PanelShell } from "@/components/panel-shell";
import { GenerateWellbeingReportButton } from "@/components/wellbeing-report-actions";
import { requireFamilyWorkspace } from "@/lib/family-page";
import { formatDateTime } from "@/lib/panel-format";
import { requireCaregiverSession } from "@/lib/page-auth";
import { getCaregiverDisplayName } from "@/lib/session";
import {
  getLatestWellbeingReport,
  parseWellbeingReportContent,
  type WellbeingMoodTrend,
} from "@/lib/wellbeing-report";

export const dynamic = "force-dynamic";

const moodLabels: Record<WellbeingMoodTrend, string> = {
  IMPROVING: "有所改善",
  STABLE: "总体平稳",
  FLUCTUATING: "有所波动",
  NEEDS_ATTENTION: "建议多关注",
  INSUFFICIENT_DATA: "数据不足",
};

const riskLabels: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  UNKNOWN: "待观察",
};

export default async function WellbeingReportsPage() {
  const caregiver = await requireCaregiverSession("/companion/reports");
  const workspace = await requireFamilyWorkspace(caregiver.id);
  const report = await getLatestWellbeingReport(
    workspace.elderProfile.elderDeviceId,
  );
  const content = report
    ? parseWellbeingReportContent(report.contentJson)
    : null;
  const hasAttentionRisk =
    content?.riskLevel === "MEDIUM" || content?.riskLevel === "HIGH";

  return (
    <PanelShell
      currentPath="/companion"
      title="AI 陪伴观察周报"
      caregiverLabel={getCaregiverDisplayName(caregiver)}
      backHref="/companion"
    >
      <p className="muted-note">
        基于最近 7 天的陪伴对话生成，只做非诊断性的陪伴回顾，不替代专业评估。
      </p>

      {!report || !content ? (
        <section className="card card-pad">
          <div className="empty">
            {report
              ? "这份周报的内容暂时无法读取，可以重新生成一份。"
              : "还没有生成陪伴周报。系统会整理最近 7 天的对话，生成一份温和的观察摘要。"}
          </div>
          <GenerateWellbeingReportButton hasReport={Boolean(report)} />
        </section>
      ) : (
        <>
          <section className="card card-pad">
            <div className="section-title">
              <h2>本周概览</h2>
              <span>
                {formatDateTime(report.periodStart)} —{" "}
                {formatDateTime(report.periodEnd)}
              </span>
            </div>
            <p className="timeline-body">{content.overview}</p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
              }}
            >
              <span className="tag">
                {moodLabels[content.moodTrend]}
              </span>
              {content.limitedData ? (
                <span className="tag neutral">样本有限</span>
              ) : null}
              {hasAttentionRisk ? (
                <span className="tag" style={{ color: "var(--danger)" }}>
                  建议关注
                </span>
              ) : null}
            </div>
            <p className="muted-note" style={{ marginTop: 8 }}>
              生成于 {formatDateTime(report.createdAt)} · 基于{" "}
              {report.userTurnCount} 条用户发言
            </p>
          </section>

          <section>
            <div className="section-title">
              <h2>情绪趋势</h2>
              <span>{moodLabels[content.moodTrend]}</span>
            </div>
            <div className="card card-pad">
              <p className="timeline-body" style={{ marginTop: 0 }}>
                {content.moodSummary}
              </p>
              <p className="muted-note" style={{ marginTop: 8 }}>
                风险观察：{riskLabels[content.riskLevel] || "待观察"}
              </p>
            </div>
          </section>

          {content.themes.length ? (
            <section>
              <div className="section-title">
                <h2>本周主题</h2>
              </div>
              <div className="feed-list">
                {content.themes.map((theme) => (
                  <article className="feed-card" key={theme.label}>
                    <div className="timeline-top strong">{theme.label}</div>
                    {theme.summary ? (
                      <p className="timeline-body">{theme.summary}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {content.strengths.length ? (
            <section className="card card-pad">
              <div className="section-title">
                <h2>值得看见</h2>
                <Lightbulb size={17} strokeWidth={1.8} />
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "var(--ink-soft)",
                  fontSize: 13,
                  lineHeight: 1.8,
                }}
              >
                {content.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.suggestions.length ? (
            <section className="card card-pad">
              <div className="section-title">
                <h2>可以试试</h2>
                <HeartPulse size={17} strokeWidth={1.8} />
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "var(--ink-soft)",
                  fontSize: 13,
                  lineHeight: 1.8,
                }}
              >
                {content.suggestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.riskNotes.length || hasAttentionRisk ? (
            <section className="alert-card red">
              <div className="timeline-top">
                <AlertTriangle size={16} strokeWidth={2} />
                需要关注
              </div>
              {content.riskNotes.length ? (
                <ul
                  style={{
                    margin: "6px 0 0",
                    paddingLeft: 18,
                    color: "var(--ink-soft)",
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  {content.riskNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="timeline-body">
                  本周对话中出现需要家人留意的表达，建议结合实际情况温和确认。
                </p>
              )}
            </section>
          ) : null}

          <p className="muted-note">{content.disclaimer}</p>
          <GenerateWellbeingReportButton hasReport />
        </>
      )}
    </PanelShell>
  );
}
