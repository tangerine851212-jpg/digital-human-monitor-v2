import Link from "next/link";
import { redirect } from "next/navigation";

import { bindDeviceToCaregiver } from "@/lib/monitor-data";
import {
  buildCaregiverLoginPath,
  getCaregiverSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

type BindPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BindPage({ searchParams }: BindPageProps) {
  const params = await searchParams;
  const rawDeviceValue =
    typeof params.deviceUuid === "string"
      ? params.deviceUuid
      : typeof params.device === "string"
        ? params.device
        : "";

  if (!rawDeviceValue) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
        <section className="w-full rounded-[36px] border border-white/70 bg-white/82 p-8 text-center shadow-[0_30px_70px_rgba(115,76,42,0.14)] backdrop-blur">
          <p className="text-sm font-medium tracking-[0.18em] text-[var(--copper)] uppercase">
            连接设备
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
            还没有收到设备信息
          </h1>
          <p className="mt-4 text-base leading-8 text-[var(--muted)]">
            请让长辈打开手机上的「家人连接」页面，把二维码给您扫一下，或将设备码复制过来。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/scan"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--copper)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--copper-deep)]"
            >
              去扫码
            </Link>
            <Link
              href="/devices"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-soft)] px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
            >
              返回设备页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const caregiver = await getCaregiverSession();

  if (!caregiver) {
    redirect(
      buildCaregiverLoginPath(
        `/bind?deviceUuid=${encodeURIComponent(rawDeviceValue)}`,
      ),
    );
  }

  let device: Awaited<ReturnType<typeof bindDeviceToCaregiver>> | null = null;
  let bindError: string | null = null;

  try {
    device = await bindDeviceToCaregiver(caregiver.id, rawDeviceValue);
  } catch (error) {
    bindError =
      error instanceof Error ? error.message : "绑定失败，请稍后再试。";
  }

  if (!device) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
        <section className="w-full rounded-[36px] border border-white/70 bg-white/84 p-8 shadow-[0_30px_70px_rgba(115,76,42,0.14)] backdrop-blur">
          <p className="text-sm font-medium tracking-[0.18em] text-[var(--copper)] uppercase">
            暂时没连上
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
            这次还没能完成设备连接
          </h1>
          <p className="mt-4 text-base leading-8 text-[var(--muted)]">
            {bindError || "请重新扫码，或请长辈重新打开设备连接页面后再试一次。"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/scan"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--copper)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--copper-deep)]"
            >
              重新扫码
            </Link>
            <Link
              href="/devices"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-soft)]"
            >
              返回设备页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-[36px] border border-white/70 bg-white/84 p-8 shadow-[0_30px_70px_rgba(115,76,42,0.14)] backdrop-blur">
        <p className="text-sm font-medium tracking-[0.18em] text-[var(--copper)] uppercase">
          连接成功
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
          已成功连接长辈的设备
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          现在可以查看长辈的留言、了解使用动态，也可以随时给长辈写一句问候。
        </p>

        <div className="mt-6 rounded-[28px] bg-[var(--paper-soft)] p-5">
          <p className="text-sm text-[var(--muted)]">设备标识</p>
          <p className="mt-2 break-all text-lg font-semibold text-[var(--ink)]">
            {device.deviceUuid}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/devices/${device.deviceUuid}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--copper)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--copper-deep)]"
          >
            查看设备详情
          </Link>
          <Link
            href="/devices"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-soft)]"
          >
            返回设备列表
          </Link>
        </div>
      </section>
    </main>
  );
}