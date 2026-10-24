"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateWellbeingReportButton({
  hasReport,
}: {
  hasReport: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function generate() {
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch("/api/wellbeing-reports", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "报告生成失败，请稍后再试。");
      }

      setNotice("本周报告已生成。");
      router.refresh();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "报告生成失败，请稍后再试。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        className="btn primary block"
        onClick={() => void generate()}
        disabled={busy}
      >
        <Sparkles size={16} strokeWidth={2} />
        {busy ? "正在生成…" : hasReport ? "重新生成本周报告" : "生成本周报告"}
      </button>
      <p className="muted-note" style={{ textAlign: "center" }}>
        {busy
          ? "AI 正在整理最近 7 天的对话，通常需要十几秒。"
          : "基于最近 7 天对话生成，不会生成诊断结论。"}
      </p>
      {notice ? (
        <p className="muted-note" style={{ textAlign: "center" }}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}
