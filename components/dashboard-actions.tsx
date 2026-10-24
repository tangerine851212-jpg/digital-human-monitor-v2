"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

import { useNavigationProgress } from "@/components/navigation-progress";

export function BindDeviceForm() {
  const router = useRouter();
  const { beginNavigationProgress } = useNavigationProgress();
  const [rawCode, setRawCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!rawCode.trim()) {
      setNotice("请先粘贴设备码。\n");
      return;
    }

    setSubmitting(true);
    setNotice("正在前往绑定页面，请稍候……");

    startTransition(() => {
      beginNavigationProgress();
      router.push(`/bind?deviceUuid=${encodeURIComponent(rawCode.trim())}`);
    });
  }

  return (
    <div className="card card-pad">
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>用设备码添加</p>
      <form className="button-row" style={{ marginTop: 9 }} onSubmit={handleSubmit}>
        <input
          value={rawCode}
          onChange={(event) => setRawCode(event.target.value)}
          placeholder="粘贴设备屏幕下方的设备码"
          className="field"
          style={{ height: 36, flex: 1, minWidth: 0 }}
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn dark"
          style={{ minHeight: 36, flex: "none" }}
        >
          {submitting ? "连接中" : "连接"}
        </button>
      </form>

      {notice ? (
        <p style={{ margin: "8px 0 0", whiteSpace: "pre-line", color: "var(--success)", fontSize: 12 }}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}

type SendMessageFormProps = {
  deviceUuid: string;
};

export function SendMessageForm({ deviceUuid }: SendMessageFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdMessagePublicId, setCreatedMessagePublicId] = useState<number | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setNotice("请先写下您想说的话。\n");
      setCreatedMessagePublicId(null);
      return;
    }

    setSubmitting(true);
    setNotice("正在送达这条留言……");

    try {
      const response = await fetch("/api/family/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceUuid,
          content,
          importance,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; publicId?: number }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "留言发送失败，请稍后再试。");
      }

      setNotice("留言已发出，对方下次使用时就能看到。\n");
      setCreatedMessagePublicId(
        typeof payload?.publicId === "number" ? payload.publicId : null,
      );
      setContent("");
      setImportance("NORMAL");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setCreatedMessagePublicId(null);
      setNotice(
        error instanceof Error ? error.message : "留言发送失败，请稍后再试。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card card-pad" onSubmit={handleSubmit}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>给对方留言</h4>
        <select
          value={importance}
          onChange={(event) => setImportance(event.target.value)}
          className="field"
          style={{ width: "auto", height: 32, padding: "0 8px", fontSize: 12 }}
        >
          <option value="LOW">温和提醒</option>
          <option value="NORMAL">日常问候</option>
          <option value="HIGH">希望尽快看到</option>
          <option value="URGENT">需要尽快联系</option>
        </select>
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        placeholder="例如：妈，晚上天气凉，记得添件衣服。晚饭后我给您打电话。"
        className="field"
        style={{ marginTop: 8 }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 9 }}>
        <button
          type="submit"
          disabled={submitting}
          className="btn primary small"
        >
          {submitting ? "正在送达" : "写好并送出"}
        </button>
      </div>

      {notice ? (
        <div style={{ marginTop: 9, color: "var(--success)", fontSize: 12, lineHeight: 1.6 }}>
          <p className="whitespace-pre-line">{notice}</p>
          {createdMessagePublicId ? (
            <Link
              href={`/messages/${createdMessagePublicId}`}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-soft)]"
            >
              打开留言 #{createdMessagePublicId}
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

type ManageDeviceFormProps = {
  deviceUuid: string;
  initialAlias?: string | null;
  deviceLabel: string;
};

export function ManageDeviceForm({
  deviceUuid,
  initialAlias,
  deviceLabel,
}: ManageDeviceFormProps) {
  const router = useRouter();
  const { beginNavigationProgress } = useNavigationProgress();
  const aliasInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [unbinding, setUnbinding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSaveAlias(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const alias = aliasInputRef.current?.value ?? "";
    setSaving(true);
    setNotice("正在保存设备别名……");

    try {
      const response = await fetch("/api/family/device-binding", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceUuid,
          alias,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; alias?: string | null; deviceName?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "设备别名保存失败。");
      }

      if (aliasInputRef.current) {
        aliasInputRef.current.value = payload?.alias?.trim() || "";
      }
      setNotice(
        payload?.alias?.trim()
          ? `已将这台设备备注为“${payload.alias.trim()}”。\n`
          : "已恢复默认设备名称。\n",
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "设备别名保存失败。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUnbind() {
    if (!window.confirm(`解绑后将不再收到“${deviceLabel}”的留言和推送提醒，确定继续吗？`)) {
      return;
    }

    setUnbinding(true);
    setNotice("正在解绑这台设备……");

    try {
      const response = await fetch("/api/family/device-binding", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceUuid,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "解绑设备失败。",);
      }

      startTransition(() => {
        beginNavigationProgress();
        router.push("/devices");
        router.refresh();
      });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "解绑设备失败。",
      );
      setUnbinding(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/88 p-5">
      <p className="text-sm font-medium tracking-[0.18em] text-[var(--copper)] uppercase">
        设备管理
      </p>
      <h4 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
        修改别名或解绑设备
      </h4>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
        设备别名会显示在设备列表、留言页和推送通知里，例如“外婆的手机”。
      </p>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSaveAlias}>
        <input
          key={`${deviceUuid}:${initialAlias ?? ""}`}
          ref={aliasInputRef}
          defaultValue={initialAlias ?? ""}
          maxLength={24}
          placeholder="给这台设备起个好记的名字"
          className="h-12 flex-1 rounded-full border border-[var(--line)] bg-[var(--paper-soft)] px-5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--copper)] focus:bg-white"
        />
        <button
          type="submit"
          disabled={saving || unbinding}
          className="inline-flex h-12 min-w-32 items-center justify-center rounded-full bg-[var(--olive)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--olive-deep)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "正在保存" : "保存别名"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void handleUnbind();
          }}
          disabled={saving || unbinding}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(160,74,48,0.28)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[rgba(199,103,51,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {unbinding ? "正在解绑" : "解绑这台设备"}
        </button>
      </div>

      {notice ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--muted)]">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
