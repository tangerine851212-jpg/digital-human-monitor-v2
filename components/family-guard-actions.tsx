"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

async function api(path: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "操作失败，请稍后再试。");
  return payload;
}

function Notice({ text }: { text: string }) {
  return text ? <p className="form-notice">{text}</p> : null;
}

export function FamilyPostForm({ deviceUuid, elderName }: { deviceUuid: string; elderName: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/family-feed", "POST", {
        deviceUuid,
        content: form.get("content"),
        visibility: form.get("visibility"),
      });
      event.currentTarget.reset();
      setNotice("已发布到家庭动态。");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "发布失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card card-pad" onSubmit={submit}>
      <label className="field-label" htmlFor="family-post-content">发一条家庭动态</label>
      <textarea id="family-post-content" className="field" name="content" required maxLength={1000} placeholder="分享一句问候，或和家人同步今天的情况……" style={{ minHeight: 88 }} />
      <div className="form-grid publish" style={{ marginTop: 10 }}>
        <select className="field" name="visibility" defaultValue="FAMILY_AND_ELDER" aria-label="动态可见范围">
          <option value="FAMILY_AND_ELDER">{elderName}和全家可见</option>
          <option value="ELDER_ONLY">只发给{elderName}</option>
          <option value="FAMILY_ONLY">仅家庭内部</option>
        </select>
        <button className="btn primary" disabled={busy}>{busy ? "发布中" : "发布"}</button>
      </div>
      <Notice text={notice} />
    </form>
  );
}

export function MemoForm({ deviceUuid }: { deviceUuid: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/memos", "POST", {
        deviceUuid,
        title: form.get("title"),
        content: form.get("content"),
        priority: form.get("priority"),
        visibility: form.get("visibility"),
      });
      event.currentTarget.reset();
      setNotice("家庭备忘已保存。");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败。");
    }
  }

  return (
    <form className="card card-pad" onSubmit={submit}>
      <label className="field-label" htmlFor="memo-title">新建家庭备忘</label>
      <div className="form-stack">
        <input id="memo-title" className="field" name="title" required maxLength={80} placeholder="备忘标题，如：医保卡位置" />
        <textarea className="field" name="content" required maxLength={1000} placeholder="写下家人需要共同记住的信息" />
        <div className="form-grid memo-actions">
          <select className="field" name="priority" aria-label="备忘优先级">
            <option value="NORMAL">普通</option>
            <option value="IMPORTANT">重要</option>
            <option value="PINNED">长期置顶</option>
          </select>
          <select className="field" name="visibility" aria-label="备忘可见范围">
            <option value="FAMILY_AND_ELDER">全员可见</option>
            <option value="FAMILY_ONLY">仅照护者可见</option>
          </select>
          <button className="btn primary">保存</button>
        </div>
      </div>
      <Notice text={notice} />
    </form>
  );
}

export function TaskForm({ deviceUuid }: { deviceUuid: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/care-tasks", "POST", {
        deviceUuid,
        title: form.get("title"),
        description: form.get("description"),
        dueAt: form.get("dueAt"),
      });
      event.currentTarget.reset();
      setNotice("照护任务已创建，等待家人认领。");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建失败。");
    }
  }

  return (
    <form className="card card-pad" onSubmit={submit}>
      <label className="field-label" htmlFor="task-title">新建照护任务</label>
      <div className="form-stack">
        <input id="task-title" className="field" name="title" required maxLength={100} placeholder="任务，如：陪爷爷周三复诊" />
        <input className="field" name="description" maxLength={500} placeholder="补充说明（可选）" />
        <div className="form-grid action">
          <input className="field" name="dueAt" type="datetime-local" aria-label="任务期限" />
          <button className="btn primary">创建任务</button>
        </div>
      </div>
      <Notice text={notice} />
    </form>
  );
}

export function TaskActions({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: string) {
    setBusy(true);
    try {
      let note: string | undefined;
      if (action === "complete") note = window.prompt("补充完成说明（可留空）") || undefined;
      await api("/api/care-tasks", "PATCH", { taskId, action, note });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "COMPLETED") return <span className="tag success" style={{ marginTop: 9 }}>已完成</span>;

  return (
    <div className="button-row">
      <button className="btn small" disabled={busy} onClick={() => void act("claim")}>{status === "CLAIMED" ? "接手人" : "我来处理"}</button>
      <button className="btn primary small" disabled={busy} onClick={() => void act("complete")}>完成</button>
    </div>
  );
}

export function MedicationForm({ deviceUuid }: { deviceUuid: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/medications", "POST", {
        deviceUuid,
        name: form.get("name"),
        dosage: form.get("dosage"),
        times: form.get("times"),
        instructions: form.get("instructions"),
        source: form.get("source"),
      });
      event.currentTarget.reset();
      setNotice("未来 7 天的用药提醒已建立。");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建失败。");
    }
  }

  return (
    <form className="card card-pad" onSubmit={submit}>
      <label className="field-label" htmlFor="medication-name">新建用药提醒</label>
      <div className="form-stack">
        <div className="form-grid two">
          <input id="medication-name" className="field" name="name" required placeholder="药品名称" />
          <input className="field" name="dosage" required placeholder="单次用量，如 1 片" />
        </div>
        <div className="form-grid two">
          <input className="field" name="times" required placeholder="时间，如 08:00, 20:00" />
          <select className="field" name="source" aria-label="用药信息来源">
            <option value="PRESCRIPTION">医生处方</option>
            <option value="PACKAGE_LABEL">药盒标签</option>
            <option value="FAMILY_ENTRY">家属录入</option>
          </select>
        </div>
        <input className="field" name="instructions" placeholder="饭前 / 饭后及其他注意事项（可选）" />
        <button className="btn primary block">建立未来 7 天提醒</button>
      </div>
      <Notice text={notice} />
    </form>
  );
}

export function CheckInButton({ deviceUuid }: { deviceUuid: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  async function create() {
    try {
      await api("/api/check-ins", "POST", { deviceUuid, prompt: "家里人想知道您今天是否安好。" });
      setNotice("报平安请求已送到长辈终端，回应后会通知全家。");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "发送失败。");
    }
  }

  return (
    <div className="checkin-action">
      <button className="btn primary block" onClick={() => void create()}><ShieldCheck size={16} strokeWidth={2} />请家人报个平安</button>
      <Notice text={notice} />
    </div>
  );
}

export function AlertActions({ alertId, status }: { alertId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: string) {
    setBusy(true);
    try {
      let note;
      if (action !== "claim") {
        note = window.prompt(action === "resolve" ? "请填写处理结果" : "请填写忽略原因") || "";
        if (!note && action === "resolve") return;
      }
      await api("/api/alerts", "PATCH", { alertId, action, note });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "RESOLVED" || status === "DISMISSED") return <span className="tag success" style={{ marginTop: 9 }}>已处理</span>;

  return (
    <div className="button-row">
      <button className="btn small" disabled={busy} onClick={() => void act("claim")}>我来处理</button>
      <button className="btn primary small" disabled={busy} onClick={() => void act("resolve")}>填写结果</button>
      <button className="btn small muted" disabled={busy} onClick={() => void act("dismiss")}>误报</button>
    </div>
  );
}

export function InviteMemberForm({ deviceUuid }: { deviceUuid: string }) {
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/api/family-circle/invite", "POST", {
        deviceUuid,
        relationLabel: form.get("relationLabel"),
        role: form.get("role"),
      });
      setUrl(result.inviteUrl);
      setCopied(false);
      setNotice("邀请链接 24 小时内有效，发给家人即可加入。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "邀请失败。");
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <form className="card card-pad" onSubmit={submit}>
      <div className="form-grid two">
        <span>
          <label className="field-label" htmlFor="invite-relation">与守护者的关系</label>
          <input id="invite-relation" className="field" name="relationLabel" placeholder="如：儿子" />
        </span>
        <span>
          <label className="field-label" htmlFor="invite-role">成员角色</label>
          <select id="invite-role" className="field" name="role">
            <option value="CAREGIVER">照护成员</option>
            <option value="CARING">关怀成员</option>
          </select>
        </span>
      </div>
      <button className="btn dark block" style={{ marginTop: 10 }}>生成邀请链接</button>
      {url ? (
        <div className="form-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 68px", marginTop: 10 }}>
          <input className="field" readOnly value={url} style={{ height: 40, background: "var(--surface-soft)", color: "var(--muted)", fontSize: 12 }} />
          <button type="button" className="btn" style={{ minHeight: 40, padding: 0 }} onClick={() => void copyInvite()}>{copied ? "已复制" : "复制"}</button>
        </div>
      ) : null}
      <Notice text={notice} />
    </form>
  );
}

export function JoinFamilyButton({ token }: { token: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  async function join() {
    try {
      await api("/api/family-circle/join", "POST", { token });
      setNotice("已加入家庭守护圈，正在打开家庭页……");
      router.push("/family");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "加入失败。");
    }
  }

  return (
    <div>
      <button className="btn primary block" onClick={() => void join()}>接受邀请并加入</button>
      <Notice text={notice} />
    </div>
  );
}
