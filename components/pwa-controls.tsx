"use client";

import { Bell, ChevronRight, PenLine, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const PWA_INSTALL_MARKER_KEY = "dh-pwa-installed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NotificationState = "checking" | "idle" | "pending" | "enabled" | "blocked" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) outputArray[index] = rawData.charCodeAt(index);
  return outputArray;
}

function isStandaloneDisplayMode() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    Boolean(navigatorWithStandalone.standalone) ||
    document.referrer.startsWith("android-app://")
  );
}

function readInstalledMarker() {
  try {
    return window.localStorage.getItem(PWA_INSTALL_MARKER_KEY) === "1";
  } catch {
    return false;
  }
}

function writeInstalledMarker() {
  try {
    window.localStorage.setItem(PWA_INSTALL_MARKER_KEY, "1");
  } catch {
    return;
  }
}

export function PwaControls({ deviceCount }: { deviceCount: number }) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [notificationState, setNotificationState] = useState<NotificationState>("checking");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function syncInstallState() {
      const standalone = isStandaloneDisplayMode();
      if (standalone) writeInstalledMarker();
      if (active) setIsInstalled(standalone || readInstalledMarker());
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      if (active) setInstallPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      writeInstalledMarker();
      if (active) setIsInstalled(true);
    }

    async function bootstrapNotifications() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
        setNotificationState("unsupported");
        return;
      }

      try {
        await navigator.serviceWorker.register("/sw.js");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!active) return;

        if (subscription) {
          if (vapidPublicKey) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: subscription.toJSON() }),
            });
          }
          setNotificationState("enabled");
        } else {
          setNotificationState(Notification.permission === "denied" ? "blocked" : "idle");
        }
      } catch {
        if (active) setNotificationState("unsupported");
      }
    }

    syncInstallState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("focus", syncInstallState);
    void bootstrapNotifications();

    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("focus", syncInstallState);
    };
  }, [vapidPublicKey]);

  async function enableNotifications() {
    if (!vapidPublicKey) {
      setNotice("当前还没有配置推送服务。");
      return;
    }

    setNotificationState("pending");
    setNotice(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationState(permission === "denied" ? "blocked" : "idle");
        setNotice(permission === "denied" ? "浏览器已拒绝通知权限，请在系统设置中重新开启。" : "这次没有开启通知，稍后仍可再次尝试。");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setNotificationState("enabled");
      setNotice("已开启紧急提醒推送。");
    } catch {
      setNotificationState("idle");
      setNotice("打开消息提醒失败，请稍后再试。");
    }
  }

  async function disableNotifications() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setNotificationState("idle");
      setNotice("这台设备的紧急提醒已关闭。");
    } catch {
      setNotice("关闭消息提醒失败，请稍后再试。");
    }
  }

  async function installApp() {
    if (isInstalled) {
      setNotice("安智伴已经添加到这台设备的主屏幕。");
      return;
    }
    if (!installPromptEvent) {
      setNotice("请从浏览器菜单中选择“安装应用”或“添加到主屏幕”。");
      return;
    }

    setInstalling(true);
    setNotice(null);
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        writeInstalledMarker();
        setInstallPromptEvent(null);
        setIsInstalled(true);
        setNotice("已确认添加到主屏幕。");
      }
    } finally {
      setInstalling(false);
    }
  }

  const pushOn = notificationState === "enabled";
  const toggleDisabled = notificationState === "checking" || notificationState === "pending" || notificationState === "unsupported";

  return (
    <section className="card">
      <div className="settings-row">
        <span className="settings-icon"><Bell size={17} strokeWidth={1.8} /></span>
        <span className="row-main">
          <span className="row-title">紧急提醒推送</span>
          <span className="row-meta">红色风险提醒将第一时间通知本机</span>
        </span>
        <button
          type="button"
          className={`toggle${pushOn ? " on" : ""}`}
          disabled={toggleDisabled}
          onClick={() => void (pushOn ? disableNotifications() : enableNotifications())}
          aria-label={pushOn ? "关闭紧急提醒推送" : "开启紧急提醒推送"}
          aria-pressed={pushOn}
        >
          <span className="toggle-knob" />
        </button>
      </div>

      <Link className="settings-row" href="/devices">
        <span className="settings-icon olive"><Smartphone size={17} strokeWidth={1.8} /></span>
        <span className="row-main">
          <span className="row-title">设备管理</span>
          <span className="row-meta">{deviceCount > 0 ? `已连接 ${deviceCount} 台设备` : "绑定安智伴设备"}</span>
        </span>
        <ChevronRight className="chevron" size={16} strokeWidth={2} />
      </Link>

      <button type="button" className="settings-row" onClick={() => void installApp()} disabled={installing}>
        <span className="settings-icon muted"><PenLine size={17} strokeWidth={1.8} /></span>
        <span className="row-main">
          <span className="row-title">添加到主屏幕</span>
          <span className="row-meta">{isInstalled ? "已添加，可像 App 一样直接打开" : installing ? "正在呼起安装" : "像 App 一样从桌面直接打开"}</span>
        </span>
        <ChevronRight className="chevron" size={16} strokeWidth={2} />
      </button>

      {notice ? <p className="form-notice" style={{ margin: 0, padding: "0 16px 13px" }}>{notice}</p> : null}
    </section>
  );
}
