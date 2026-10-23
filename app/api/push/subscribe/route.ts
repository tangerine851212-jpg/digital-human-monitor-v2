import { NextResponse } from "next/server";

import { getCaregiverSession } from "@/lib/session";
import { savePushSubscription } from "@/lib/push";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        subscription?: {
          endpoint?: string;
          expirationTime?: number | null;
          keys?: {
            p256dh?: string;
            auth?: string;
          };
        };
      }
    | null;

  const rawSubscription = body?.subscription;

  if (
    !rawSubscription ||
    typeof rawSubscription.endpoint !== "string" ||
    !rawSubscription.endpoint.trim()
  ) {
    return NextResponse.json({ error: "subscription 是必填项。" }, { status: 400 });
  }

  const subscription = {
    endpoint: rawSubscription.endpoint,
    expirationTime:
      typeof rawSubscription.expirationTime === "number" ||
      rawSubscription.expirationTime === null
        ? rawSubscription.expirationTime
        : undefined,
    keys:
      rawSubscription.keys && typeof rawSubscription.keys === "object"
        ? {
            p256dh:
              typeof rawSubscription.keys.p256dh === "string"
                ? rawSubscription.keys.p256dh
                : undefined,
            auth:
              typeof rawSubscription.keys.auth === "string"
                ? rawSubscription.keys.auth
                : undefined,
          }
        : undefined,
  };

  try {
    const caregiver = await getCaregiverSession();

    if (!caregiver) {
      return NextResponse.json(
        { error: "请先登录账号后再开启消息提醒。" },
        { status: 401 },
      );
    }

    await savePushSubscription({
      caregiverId: caregiver.id,
      subscription,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "保存推送订阅失败。",
      },
      { status: 400 },
    );
  }
}