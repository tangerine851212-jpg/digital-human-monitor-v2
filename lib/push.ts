import { MessageDirection } from "@prisma/client";
import webpush from "web-push";

import { getDeviceName, truncateText } from "@/lib/panel-format";
import { prisma } from "@/lib/prisma";

type SerializablePushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type StoredPushSubscription = {
  endpoint: string;
  expirationTime: Date | null;
  p256dh: string;
  auth: string;
};

type PushDeliverySummary = {
  targetedCount: number;
  sentCount: number;
  removedCount: number;
  failedCount: number;
};

type PushFailureDetail = {
  endpointHost: string;
  statusCode: number | null;
  message: string;
  body: string | null;
  reason: string | null;
};

type PushDeliveryResult = PushDeliverySummary & {
  failureDetails?: PushFailureDetail[];
};

type PushAttemptResult = {
  outcome: "sent" | "removed" | "failed";
  detail?: PushFailureDetail;
};

const APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://digital-human.xn--876a.net"
).replace(/\/+$/, "");

let vapidReady = false;

function hasPushConfiguration() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function ensureVapidDetails() {
  if (!hasPushConfiguration()) {
    throw new Error("VAPID 配置尚未完成，暂时不能发送推送通知。");
  }

  if (vapidReady) {
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidReady = true;
}

function normalizeSubscription(input: SerializablePushSubscription) {
  const endpoint = input.endpoint?.trim();
  const p256dh = input.keys?.p256dh?.trim();
  const auth = input.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error("推送订阅信息不完整。");
  }

  return {
    endpoint,
    p256dh,
    auth,
    expirationTime:
      typeof input.expirationTime === "number"
        ? new Date(input.expirationTime)
        : null,
  };
}

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${APP_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getPushPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

export function isPushAvailable() {
  return hasPushConfiguration();
}

export async function savePushSubscription(input: {
  caregiverId: string;
  subscription: SerializablePushSubscription;
  userAgent?: string | null;
}) {
  const subscription = normalizeSubscription(input.subscription);

  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      caregiverId: input.caregiverId,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      expirationTime: subscription.expirationTime,
      userAgent: input.userAgent?.trim() || null,
    },
    create: {
      caregiverId: input.caregiverId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      expirationTime: subscription.expirationTime,
      userAgent: input.userAgent?.trim() || null,
    },
  });
}

export async function removePushSubscription(input: {
  caregiverId: string;
  endpoint: string;
}) {
  await prisma.pushSubscription.deleteMany({
    where: {
      caregiverId: input.caregiverId,
      endpoint: input.endpoint.trim(),
    },
  });
}

function getEndpointHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}

function shouldOmitTopic(endpoint: string) {
  return getEndpointHost(endpoint) === "web.push.apple.com";
}

function getPushFailureDetail(subscription: StoredPushSubscription, error: unknown) {
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : null;
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message || "推送发送失败")
      : "推送发送失败";
  const body =
    error && typeof error === "object" && "body" in error
      ? String((error as { body?: string }).body || "") || null
      : null;

  let reason: string | null = null;

  if (body) {
    try {
      const parsedBody = JSON.parse(body) as { reason?: unknown };
      reason = typeof parsedBody.reason === "string" ? parsedBody.reason : null;
    } catch {
      reason = null;
    }
  }

  return {
    endpointHost: getEndpointHost(subscription.endpoint),
    statusCode,
    message,
    body,
    reason,
  } satisfies PushFailureDetail;
}

async function sendPushNotification(input: {
  subscription: StoredPushSubscription;
  payload: string;
  topic?: string;
  collectFailureDetails?: boolean;
}) {
  const requestOptions: {
    TTL: number;
    urgency: "high";
    topic?: string;
  } = {
    TTL: 60 * 30,
    urgency: "high",
  };

  if (input.topic && !shouldOmitTopic(input.subscription.endpoint)) {
    requestOptions.topic = input.topic;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: input.subscription.endpoint,
        expirationTime: input.subscription.expirationTime?.getTime() || null,
        keys: {
          p256dh: input.subscription.p256dh,
          auth: input.subscription.auth,
        },
      },
      input.payload,
      requestOptions,
    );

    return {
      outcome: "sent",
    } satisfies PushAttemptResult;
  } catch (error) {
    const detail = getPushFailureDetail(input.subscription, error);
    const statusCode = detail.statusCode || 0;

    console.error("Push notification delivery failed", detail);

    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: input.subscription.endpoint },
      });

      return {
        outcome: "removed",
        detail: input.collectFailureDetails ? detail : undefined,
      } satisfies PushAttemptResult;
    }

    return {
      outcome: "failed",
      detail: input.collectFailureDetails ? detail : undefined,
    } satisfies PushAttemptResult;
  }
}

async function deliverPushToSubscriptions(input: {
  subscriptions: StoredPushSubscription[];
  payload: string;
  topic?: string;
  collectFailureDetails?: boolean;
}) {
  if (input.subscriptions.length === 0) {
    return {
      targetedCount: 0,
      sentCount: 0,
      removedCount: 0,
      failedCount: 0,
      failureDetails: [],
    } satisfies PushDeliveryResult;
  }

  ensureVapidDetails();

  const results = await Promise.all(
    input.subscriptions.map(async (subscription) => {
      return sendPushNotification({
        subscription,
        payload: input.payload,
        topic: input.topic,
        collectFailureDetails: input.collectFailureDetails,
      });
    }),
  );

  const failureDetails = results
    .map((result) => result.detail)
    .filter((detail): detail is PushFailureDetail => Boolean(detail));

  return {
    targetedCount: input.subscriptions.length,
    sentCount: results.filter((result) => result.outcome === "sent").length,
    removedCount: results.filter((result) => result.outcome === "removed").length,
    failedCount: results.filter((result) => result.outcome === "failed").length,
    failureDetails,
  } satisfies PushDeliveryResult;
}

export async function sendIncomingMessagePush(publicId: number) {
  if (!hasPushConfiguration()) {
    return;
  }

  const message = await prisma.familyMessage.findUnique({
    where: { publicId },
    select: {
      publicId: true,
      content: true,
      direction: true,
      elderDeviceId: true,
      elderDevice: {
        select: {
          deviceUuid: true,
          displayName: true,
        },
      },
    },
  });

  if (!message || message.direction !== MessageDirection.ELDER_TO_FAMILY) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      caregiver: {
        bindings: {
          some: {
            elderDeviceId: message.elderDeviceId,
          },
        },
      },
    },
    select: {
      endpoint: true,
      expirationTime: true,
      p256dh: true,
      auth: true,
      caregiver: {
        select: {
          bindings: {
            where: {
              elderDeviceId: message.elderDeviceId,
            },
            select: {
              alias: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (subscriptions.length === 0) {
    return;
  }

  ensureVapidDetails();

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const deviceName = getDeviceName(
        subscription.caregiver.bindings[0]?.alias,
        message.elderDevice.displayName,
      );

      const payload = JSON.stringify({
        title: `${deviceName} 发来一条新留言`,
        body: truncateText(message.content, 72),
        url: absoluteUrl(`/messages/${message.publicId}`),
        icon: absoluteUrl("/pwa/icon-192x192.png"),
        badge: absoluteUrl("/pwa/badge-96x96.png"),
        tag: `message-${message.publicId}`,
      });

      await sendPushNotification({
        subscription: {
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload,
        topic: `msg-${message.publicId}`,
      });
    }),
  );
}

export async function sendCaregiverTestPush(input: {
  caregiverId: string;
  caregiverLabel: string;
}) {
  if (!hasPushConfiguration()) {
    throw new Error("当前环境还没有配置推送服务。",
    );
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      caregiverId: input.caregiverId,
    },
    select: {
      endpoint: true,
      expirationTime: true,
      p256dh: true,
      auth: true,
    },
  });

  const payload = JSON.stringify({
    title: "安智伴推送测试",
    body: `${input.caregiverLabel} 账号下的通知链路工作正常。`,
    url: absoluteUrl("/settings"),
    icon: absoluteUrl("/pwa/icon-192x192.png"),
    badge: absoluteUrl("/pwa/badge-96x96.png"),
    tag: `push-test-${input.caregiverId}`,
  });

  return deliverPushToSubscriptions({
    subscriptions,
    payload,
    topic: `test-${input.caregiverId.slice(0, 20)}`,
    collectFailureDetails: true,
  });
}

export async function sendGuardAlertPush(alertId: string) {
  if (!hasPushConfiguration()) return;
  const alert = await prisma.safetyAlert.findUnique({
    where: { id: alertId },
    include: {
      familyCircle: {
        include: {
          elderProfile: { include: { elderDevice: true } },
          memberships: {
            where: { status: "ACTIVE", emergencyPush: true },
            include: { caregiver: { include: { pushSubscriptions: true } } },
          },
        },
      },
    },
  });
  if (!alert) return;
  const subscriptions = alert.familyCircle.memberships.flatMap((member) => member.caregiver.pushSubscriptions);
  const payload = JSON.stringify({
    title: `${alert.level === "RED" ? "紧急关注" : "守护提醒"} · ${alert.familyCircle.elderProfile.preferredName}`,
    body: truncateText(alert.summary, 72),
    url: absoluteUrl(`/guard#alert-${alert.id}`),
    icon: absoluteUrl("/pwa/icon-192x192.png"),
    badge: absoluteUrl("/pwa/badge-96x96.png"),
    tag: `guard-alert-${alert.id}`,
  });
  await deliverPushToSubscriptions({ subscriptions, payload, topic: `guard-${alert.id}` });
}
