"use client";

import { useState } from "react";

type PushTestPanelProps = {
  initialSubscriptionCount: number;
  deviceCount: number;
};

type PushFailureDetail = {
  endpointHost?: string;
  statusCode?: number | null;
  message?: string;
  body?: string | null;
  reason?: string | null;
};

export function PushTestPanel({
  initialSubscriptionCount,
  deviceCount,
}: PushTestPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(
    initialSubscriptionCount,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [failureDetails, setFailureDetails] = useState<PushFailureDetail[]>([]);

  async function handleTestPush() {
    setSubmitting(true);
    setNotice(null);
    setFailureDetails([]);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            targetedCount?: number;
            sentCount?: number;
            removedCount?: number;
            failedCount?: number;
            failureDetails?: PushFailureDetail[];
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "测试推送发送失败。",);
      }

      const targetedCount = payload?.targetedCount || 0;
      const removedCount = payload?.removedCount || 0;
      const sentCount = payload?.sentCount || 0;
      const failedCount = payload?.failedCount || 0;
      const nextFailureDetails = Array.isArray(payload?.failureDetails)
        ? payload.failureDetails
        : [];

      setSubscriptionCount(Math.max(0, targetedCount - removedCount));
      setFailureDetails(nextFailureDetails);

      if (targetedCount === 0) {
        setNotice("当前账号还没有任何开启消息提醒的设备，先在要接收通知的设备上打开消息提醒。\n");
        return;
      }

      const fragments = [`已向 ${targetedCount} 台设备发出测试通知。`];

      if (sentCount > 0) {
        fragments.push(`成功送出 ${sentCount} 条。`);
      }

      if (removedCount > 0) {
        fragments.push(`清理了 ${removedCount} 个失效订阅。`);
      }

      if (failedCount > 0) {
        fragments.push(`${failedCount} 台设备本次发送失败。`);
      }

      setNotice(`${fragments.join(" ")}\n`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "测试推送发送失败。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_22px_55px_rgba(53,84,141,0.12)]">
      <p className="text-sm font-medium tracking-[0.18em] text-[var(--copper)] uppercase">
        推送测试
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
        给当前账号的所有设备发一条测试通知
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
        用来确认这位家属账号下已经开启提醒的设备，是否都能正常收到推送。
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
        <span className="rounded-full border border-[var(--line)] bg-[var(--paper-soft)] px-4 py-2">
          已连接设备 {deviceCount}
        </span>
        <span className="rounded-full border border-[var(--line)] bg-[var(--paper-soft)] px-4 py-2">
          已开启提醒的设备 {subscriptionCount}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void handleTestPush();
          }}
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--copper)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--copper-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "正在发送测试通知" : "发送测试推送"}
        </button>
      </div>

      {notice ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[var(--muted)]">
          {notice}
        </p>
      ) : null}

      {failureDetails.length > 0 ? (
        <div className="mt-4 space-y-3">
          {failureDetails.map((detail, index) => (
            <div
              key={`${detail.endpointHost || "unknown"}-${index}`}
              className="rounded-[20px] bg-[var(--paper-soft)] px-4 py-4 text-sm leading-7 text-[var(--muted)]"
            >
              <p className="font-semibold text-[var(--ink)]">
                {detail.endpointHost || "unknown"}
                {typeof detail.statusCode === "number"
                  ? ` · HTTP ${detail.statusCode}`
                  : ""}
              </p>
              <p className="mt-1">
                {detail.reason || detail.message || "推送发送失败"}
              </p>
              {detail.body ? <p className="mt-1 break-all">{detail.body}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}