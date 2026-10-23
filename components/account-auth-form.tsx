"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useNavigationProgress } from "@/components/navigation-progress";

type AccountAuthFormProps = {
  redirectTo: string;
};

type AuthMode = "login" | "register";

export function AccountAuthForm({ redirectTo }: AccountAuthFormProps) {
  const router = useRouter();
  const { beginNavigationProgress } = useNavigationProgress();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim()) {
      setNotice("请先输入用户名。");
      return;
    }

    if (!password) {
      setNotice("请先输入密码。");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setNotice("两次输入的密码还不一致，请再检查一次。");
      return;
    }

    setSubmitting(true);
    setNotice(mode === "login" ? "正在登录账号……" : "正在创建账号……");

    try {
      const response = await fetch(
        mode === "login" ? "/api/account/login" : "/api/account/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
            redirectTo,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; redirectTo?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            (mode === "login"
              ? "登录失败，请稍后再试。"
              : "创建账号失败，请稍后再试。"),
        );
      }

      setNotice(mode === "login" ? "登录成功，正在进入……" : "账号已创建，正在进入……");
      startTransition(() => {
        beginNavigationProgress();
        router.replace(payload?.redirectTo || redirectTo);
        router.refresh();
      });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "操作失败，请稍后再试。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="segment">
        {[
          { id: "login", label: "已有账号，直接登录" },
          { id: "register", label: "第一次使用，创建账号" },
        ].map((item) => {
          const active = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id as AuthMode);
                setNotice(null);
              }}
              className={active ? "active" : ""}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <form style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }} onSubmit={handleSubmit}>
        <div>
          <label className="sr-only" htmlFor="caregiver-username">用户名</label>
          <input
            id="caregiver-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="用户名"
            className="field"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="caregiver-password">密码</label>
          <input
            id="caregiver-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="请输入密码"
            className="field"
          />
        </div>

        {mode === "register" ? (
          <div>
            <label className="sr-only" htmlFor="caregiver-password-confirm">再输入一次密码</label>
            <input
              id="caregiver-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="再次输入密码"
              className="field"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn primary block"
          style={{ minHeight: 44 }}
        >
          {submitting
            ? mode === "login"
              ? "正在登录"
              : "正在创建账号"
            : mode === "login"
              ? "登录并继续"
              : "创建账号并继续"}
        </button>
      </form>

      {notice ? (
        <p style={{ margin: "10px 0 0", borderRadius: 8, background: "var(--surface)", padding: "10px 12px", color: "var(--muted)", fontSize: 12, lineHeight: 1.6 }}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}
