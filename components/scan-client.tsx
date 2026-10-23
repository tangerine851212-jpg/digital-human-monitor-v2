"use client";

import QrScanner from "qr-scanner";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import { useNavigationProgress } from "@/components/navigation-progress";

function extractDeviceUuid(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return (
      parsedUrl.searchParams.get("deviceUuid") ||
      parsedUrl.searchParams.get("device") ||
      null
    );
  } catch {
    return trimmedValue;
  }
}

export function ScanClient() {
  const router = useRouter();
  const { beginNavigationProgress } = useNavigationProgress();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [statusText, setStatusText] = useState("正在准备镜头……");
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleDecode = useEffectEvent(async (result: { data: string }) => {
    const scannedValue = extractDeviceUuid(result.data);

    if (!scannerRef.current || !scannedValue) {
      return;
    }

    scannerRef.current.stop();
    setErrorText(null);
    setStatusText("识别到了设备，正在打开绑定页面……");

    startTransition(() => {
      beginNavigationProgress();
      router.replace(
        `/bind?deviceUuid=${encodeURIComponent(scannedValue)}&source=scan`,
      );
    });
  });

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      if (!videoRef.current) {
        return;
      }

      try {
        const hasCamera = await QrScanner.hasCamera();

        if (!hasCamera) {
          setErrorText("当前设备没有可用摄像头，请改用手动粘贴设备码。");
          setStatusText("无法打开镜头");
          return;
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            void handleDecode(result as { data: string });
          },
          {
            preferredCamera: "environment",
            highlightCodeOutline: true,
            highlightScanRegion: true,
            returnDetailedScanResult: true,
            onDecodeError: () => {},
          },
        );

        scannerRef.current = scanner;
        await scanner.start();

        if (!cancelled) {
          setStatusText("请将长辈手机上的二维码放到取景框内。");
        }
      } catch (error) {
        setErrorText(
          error instanceof Error
            ? error.message
            : "镜头启动失败，请检查权限后重试。",
        );
        setStatusText("镜头启动失败");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  return (
    <div className="rounded-[32px] border border-white/75 bg-white/82 p-6 shadow-[0_26px_60px_rgba(115,76,42,0.12)]">
      <p className="text-sm font-medium tracking-[0.18em] text-[var(--copper)] uppercase">
        扫码画面
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        将二维码放入取景框
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
        保持画面稳定一两秒，识别成功后会自动继续，不需要额外点击。
      </p>

      <div className="relative mt-5 overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--ink)]/95">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-[3/4] w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0_28%,rgba(10,7,5,0.48)_29%_100%)]" />
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-base font-semibold text-[var(--ink)]">{statusText}</p>
        <p className="text-sm leading-7 text-[var(--muted)]">
          扫描成功后会自动连接长辈的设备，无需额外操作。
        </p>
        {errorText ? (
          <p className="rounded-[20px] bg-[var(--paper-soft)] px-4 py-3 text-sm leading-7 text-[var(--copper-deep)]">
            {errorText}
          </p>
        ) : null}
      </div>
    </div>
  );
}