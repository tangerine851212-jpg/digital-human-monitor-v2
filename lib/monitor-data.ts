import {
  ConversationRole,
  MessageDirection,
  MessageImportance,
  MessageStatus,
  ToolCallStatus,
  UsageEventType,
} from "@prisma/client";

import { sendIncomingMessagePush } from "@/lib/push";
import { prisma } from "@/lib/prisma";

type RegisterDeviceInput = {
  deviceUuid: string;
  displayName?: string;
  appVersion?: string;
};

type UsageEventInput = {
  deviceUuid: string;
  eventType: UsageEventType;
  detailJson?: string;
};

type ConversationTurnInput = {
  deviceUuid: string;
  sessionId?: string;
  turns: Array<{
    role: ConversationRole;
    content: string;
    metaJson?: string;
    createdAt?: string;
  }>;
};

type ToolCallInput = {
  deviceUuid: string;
  toolName: string;
  arguments: Record<string, unknown>;
  outputText?: string;
  status: ToolCallStatus;
  callId?: string;
  sessionId?: string;
};

const PUBLIC_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://digital-human.xn--876a.net"
).replace(/\/+$/, "");
const DEVICE_ALIAS_MAX_LENGTH = 24;

const DEVICE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeDeviceUuid(rawValue: string) {
  return rawValue.trim().toLowerCase();
}

export function createBindUrl(deviceUuid: string) {
  return `${PUBLIC_BASE_URL}/bind?deviceUuid=${encodeURIComponent(
    normalizeDeviceUuid(deviceUuid),
  )}`;
}

export function extractDeviceUuid(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const queryDeviceUuid =
      parsedUrl.searchParams.get("deviceUuid") ||
      parsedUrl.searchParams.get("device");

    if (queryDeviceUuid && DEVICE_UUID_PATTERN.test(queryDeviceUuid)) {
      return normalizeDeviceUuid(queryDeviceUuid);
    }

    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).at(-1);
    if (lastSegment && DEVICE_UUID_PATTERN.test(lastSegment)) {
      return normalizeDeviceUuid(lastSegment);
    }
  } catch {
    if (DEVICE_UUID_PATTERN.test(trimmedValue)) {
      return normalizeDeviceUuid(trimmedValue);
    }
  }

  return null;
}

function normalizeDeviceAlias(rawAlias?: string | null) {
  const alias = rawAlias?.trim() || null;

  if (!alias) {
    return null;
  }

  if (alias.length > DEVICE_ALIAS_MAX_LENGTH) {
    throw new Error(`设备别名请控制在 ${DEVICE_ALIAS_MAX_LENGTH} 个字以内。`);
  }

  return alias;
}

function resolveBindingDisplayName(alias?: string | null, displayName?: string | null) {
  return alias?.trim() || displayName?.trim() || null;
}

export async function ensureDeviceRegistration(input: RegisterDeviceInput) {
  const deviceUuid = normalizeDeviceUuid(input.deviceUuid);

  return prisma.elderDevice.upsert({
    where: { deviceUuid },
    update: {
      displayName: input.displayName?.trim() || undefined,
      appVersion: input.appVersion?.trim() || undefined,
      lastSeenAt: new Date(),
    },
    create: {
      deviceUuid,
      displayName: input.displayName?.trim() || undefined,
      appVersion: input.appVersion?.trim() || undefined,
      lastSeenAt: new Date(),
    },
  });
}

export async function bindDeviceToCaregiver(
  caregiverId: string,
  rawDeviceValue: string,
) {
  const deviceUuid = extractDeviceUuid(rawDeviceValue);

  if (!deviceUuid) {
    throw new Error("设备码格式不正确，请重新扫码或粘贴。");
  }

  const device = await ensureDeviceRegistration({ deviceUuid });

  await migrateLegacyCaregiverDataForDevice(caregiverId, device.id);

  await prisma.deviceBinding.upsert({
    where: {
      caregiverId_elderDeviceId: {
        caregiverId,
        elderDeviceId: device.id,
      },
    },
    update: {},
    create: {
      caregiverId,
      elderDeviceId: device.id,
    },
  });

  return device;
}

async function migrateLegacyCaregiverDataForDevice(
  caregiverId: string,
  elderDeviceId: string,
) {
  const legacyCaregivers = await prisma.caregiverAccount.findMany({
    where: {
      id: { not: caregiverId },
      username: null,
      bindings: {
        some: {
          elderDeviceId,
        },
      },
    },
    select: {
      id: true,
    },
    take: 2,
  });

  if (legacyCaregivers.length !== 1) {
    return;
  }

  const legacyCaregiverId = legacyCaregivers[0]?.id;

  if (!legacyCaregiverId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const legacyBindings = await tx.deviceBinding.findMany({
      where: {
        caregiverId: legacyCaregiverId,
      },
      select: {
        elderDeviceId: true,
        alias: true,
      },
    });

    await Promise.all(
      legacyBindings.map((binding) =>
        tx.deviceBinding.upsert({
          where: {
            caregiverId_elderDeviceId: {
              caregiverId,
              elderDeviceId: binding.elderDeviceId,
            },
          },
          update: binding.alias ? { alias: binding.alias } : {},
          create: {
            caregiverId,
            elderDeviceId: binding.elderDeviceId,
            alias: binding.alias,
          },
        }),
      ),
    );

    await tx.familyMessage.updateMany({
      where: {
        caregiverId: legacyCaregiverId,
      },
      data: {
        caregiverId,
      },
    });

    await tx.pushSubscription.updateMany({
      where: {
        caregiverId: legacyCaregiverId,
      },
      data: {
        caregiverId,
      },
    });

    await tx.deviceBinding.deleteMany({
      where: {
        caregiverId: legacyCaregiverId,
      },
    });

    await tx.caregiverSession.deleteMany({
      where: {
        caregiverId: legacyCaregiverId,
      },
    });

    await tx.caregiverAccount.delete({
      where: {
        id: legacyCaregiverId,
      },
    });
  });
}

function parseImportance(rawImportance?: string | null) {
  const normalizedImportance = rawImportance?.trim().toUpperCase();

  switch (normalizedImportance) {
    case MessageImportance.LOW:
      return MessageImportance.LOW;
    case MessageImportance.HIGH:
      return MessageImportance.HIGH;
    case MessageImportance.URGENT:
      return MessageImportance.URGENT;
    default:
      return MessageImportance.NORMAL;
  }
}

function buildFamilyMessageSummary(
  messages: Array<{ content: string }>,
  unreadCount: number,
) {
  if (messages.length === 0) {
    return "家里人暂时还没有新的留言。";
  }

  const preview = messages
    .slice(0, 3)
    .map((message, index) => `${index + 1}. ${message.content}`)
    .join(" ");

  if (unreadCount > 0) {
    return `家里人给您留了${unreadCount}条新话：${preview}`;
  }

  return `家里人最近说：${preview}`;
}

export async function listFamilyMessagesForDevice(
  rawDeviceValue: string,
  take = 12,
) {
  const deviceUuid = extractDeviceUuid(rawDeviceValue);

  if (!deviceUuid) {
    throw new Error("设备码格式不正确。");
  }

  const device = await ensureDeviceRegistration({ deviceUuid });
  const messages = await prisma.familyMessage.findMany({
    where: {
      elderDeviceId: device.id,
      direction: MessageDirection.FAMILY_TO_ELDER,
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const unreadCount = await prisma.familyMessage.count({
    where: {
      elderDeviceId: device.id,
      direction: MessageDirection.FAMILY_TO_ELDER,
      readAt: null,
    },
  });

  await prisma.familyMessage.updateMany({
    where: {
      elderDeviceId: device.id,
      direction: MessageDirection.FAMILY_TO_ELDER,
      deliveredAt: null,
    },
    data: {
      deliveredAt: new Date(),
      status: MessageStatus.DELIVERED,
    },
  });

  const summarySource =
    messages.filter((message) => message.readAt === null).length > 0
      ? messages.filter((message) => message.readAt === null)
      : messages;

  return {
    device,
    unreadCount,
    summaryText: buildFamilyMessageSummary(summarySource, unreadCount),
    messages,
  };
}

export async function markFamilyMessagesAsRead(
  rawDeviceValue: string,
  messageIds?: string[],
) {
  const deviceUuid = extractDeviceUuid(rawDeviceValue);

  if (!deviceUuid) {
    throw new Error("设备码格式不正确。");
  }

  const device = await ensureDeviceRegistration({ deviceUuid });
  const now = new Date();

  await prisma.familyMessage.updateMany({
    where: {
      elderDeviceId: device.id,
      direction: MessageDirection.FAMILY_TO_ELDER,
      readAt: null,
      id: messageIds?.length ? { in: messageIds } : undefined,
    },
    data: {
      readAt: now,
      deliveredAt: now,
      status: MessageStatus.READ,
    },
  });
}

export async function createFamilyMessageFromCaregiver(input: {
  caregiverId: string;
  rawDeviceValue: string;
  content: string;
  importance?: string;
}) {
  const deviceUuid = extractDeviceUuid(input.rawDeviceValue);

  if (!deviceUuid) {
    throw new Error("设备码格式不正确，请重新扫码或粘贴。");
  }

  const binding = await prisma.deviceBinding.findFirst({
    where: {
      caregiverId: input.caregiverId,
      elderDevice: {
        deviceUuid,
      },
    },
    include: {
      elderDevice: true,
    },
  });

  if (!binding) {
    throw new Error("这位老人还没有绑定到当前家属账号。");
  }

  return prisma.familyMessage.create({
    data: {
      elderDeviceId: binding.elderDeviceId,
      caregiverId: input.caregiverId,
      direction: MessageDirection.FAMILY_TO_ELDER,
      content: input.content.trim(),
      importance: parseImportance(input.importance),
      status: MessageStatus.PENDING,
      source: "FAMILY_PANEL",
    },
  });
}

async function findCaregiverDeviceBinding(
  caregiverId: string,
  rawDeviceValue: string,
) {
  const deviceUuid = extractDeviceUuid(rawDeviceValue);

  if (!deviceUuid) {
    throw new Error("设备码格式不正确，请重新扫码或粘贴。");
  }

  const binding = await prisma.deviceBinding.findFirst({
    where: {
      caregiverId,
      elderDevice: {
        deviceUuid,
      },
    },
    include: {
      elderDevice: true,
    },
  });

  if (!binding) {
    throw new Error("当前家属账号还没有绑定这台设备。");
  }

  return binding;
}

export async function updateCaregiverDeviceAlias(input: {
  caregiverId: string;
  rawDeviceValue: string;
  alias?: string | null;
}) {
  const binding = await findCaregiverDeviceBinding(
    input.caregiverId,
    input.rawDeviceValue,
  );
  const alias = normalizeDeviceAlias(input.alias);

  return prisma.deviceBinding.update({
    where: {
      id: binding.id,
    },
    data: {
      alias,
    },
    include: {
      elderDevice: true,
    },
  });
}

export async function unbindDeviceFromCaregiver(
  caregiverId: string,
  rawDeviceValue: string,
) {
  const binding = await findCaregiverDeviceBinding(caregiverId, rawDeviceValue);

  await prisma.deviceBinding.delete({
    where: {
      id: binding.id,
    },
  });

  return {
    deviceUuid: binding.elderDevice.deviceUuid,
  };
}

export async function recordUsageEvent(input: UsageEventInput) {
  const device = await ensureDeviceRegistration({ deviceUuid: input.deviceUuid });

  return prisma.usageEvent.create({
    data: {
      elderDeviceId: device.id,
      eventType: input.eventType,
      detailJson: input.detailJson || undefined,
    },
  });
}

export async function recordConversationTurns(input: ConversationTurnInput) {
  const device = await ensureDeviceRegistration({ deviceUuid: input.deviceUuid });
  const validTurns = input.turns
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim(),
      metaJson: turn.metaJson?.trim() || null,
      createdAt: turn.createdAt ? new Date(turn.createdAt) : new Date(),
    }))
    .filter((turn) => turn.content.length > 0);

  if (validTurns.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.conversationTurn.createMany({
    data: validTurns.map((turn) => ({
      elderDeviceId: device.id,
      sessionId: input.sessionId?.trim() || null,
      role: turn.role,
      content: turn.content,
      metaJson: turn.metaJson,
      createdAt: turn.createdAt,
    })),
  });

  return { count: result.count };
}

export async function recordToolCall(input: ToolCallInput) {
  const device = await ensureDeviceRegistration({ deviceUuid: input.deviceUuid });

  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.toolCallLog.create({
      data: {
        elderDeviceId: device.id,
        sessionId: input.sessionId?.trim() || null,
        callId: input.callId?.trim() || null,
        toolName: input.toolName.trim(),
        argumentsJson: JSON.stringify(input.arguments),
        outputText: input.outputText?.trim() || null,
        status: input.status,
      },
    });

    await tx.usageEvent.create({
      data: {
        elderDeviceId: device.id,
        eventType: UsageEventType.TOOL_CALLED,
        detailJson: JSON.stringify({
          toolName: input.toolName,
          callId: input.callId || null,
          status: input.status,
        }),
      },
    });

    const messageText =
      typeof input.arguments.message === "string"
        ? input.arguments.message.trim()
        : "";
    let createdMessagePublicId: number | null = null;

    if (
      input.status === ToolCallStatus.SUCCESS &&
      input.toolName === "leave_message_for_family" &&
      messageText
    ) {
      const createdMessage = await tx.familyMessage.create({
        data: {
          elderDeviceId: device.id,
          direction: MessageDirection.ELDER_TO_FAMILY,
          content: messageText,
          recipientRelation:
            typeof input.arguments.recipientRelation === "string"
              ? input.arguments.recipientRelation.trim()
              : null,
          importance: parseImportance(
            typeof input.arguments.importance === "string"
              ? input.arguments.importance
              : null,
          ),
          status: MessageStatus.DELIVERED,
          deliveredAt: new Date(),
          source: "MODEL_TOOL",
        },
      });

      createdMessagePublicId = createdMessage.publicId;
      const circle = await tx.familyCircle.findFirst({
        where: { elderProfile: { elderDeviceId: device.id } },
        select: { id: true },
      });
      if (circle) {
        await tx.familyPost.create({
          data: {
            familyCircleId: circle.id,
            content: messageText,
            elderAuthored: true,
            visibility: "FAMILY_AND_ELDER",
            deliveredAt: new Date(),
          },
        });
      }
    }

    return {
      log,
      createdMessagePublicId,
    };
  });

  if (result.createdMessagePublicId) {
    void sendIncomingMessagePush(result.createdMessagePublicId).catch(() => {
      return undefined;
    });
  }

  return result.log;
}

export async function getCaregiverDashboard(caregiverId: string) {
  const caregiver = await prisma.caregiverAccount.findUnique({
    where: { id: caregiverId },
    include: {
      bindings: {
        orderBy: { createdAt: "desc" },
        include: {
          elderDevice: {
            include: {
              messages: {
                orderBy: { createdAt: "desc" },
                take: 8,
              },
              usageEvents: {
                orderBy: { createdAt: "desc" },
                take: 6,
              },
              conversationTurns: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
              toolCalls: {
                orderBy: { createdAt: "desc" },
                take: 4,
              },
              _count: {
                select: {
                  messages: true,
                  usageEvents: true,
                  conversationTurns: true,
                  toolCalls: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!caregiver) {
    throw new Error("当前家属账号不存在。");
  }

  const elderDeviceIds = caregiver.bindings.map((binding) => binding.elderDeviceId);
  const familyUnreadCounts = elderDeviceIds.length
    ? await prisma.familyMessage.groupBy({
        by: ["elderDeviceId"],
        _count: { _all: true },
        where: {
          elderDeviceId: { in: elderDeviceIds },
          direction: MessageDirection.FAMILY_TO_ELDER,
          readAt: null,
        },
      })
    : [];

  const elderUnreadCounts = elderDeviceIds.length
    ? await prisma.familyMessage.groupBy({
        by: ["elderDeviceId"],
        _count: { _all: true },
        where: {
          elderDeviceId: { in: elderDeviceIds },
          direction: MessageDirection.ELDER_TO_FAMILY,
          readAt: null,
        },
      })
    : [];

  const familyUnreadMap = new Map(
    familyUnreadCounts.map((item) => [item.elderDeviceId, item._count._all]),
  );
  const elderUnreadMap = new Map(
    elderUnreadCounts.map((item) => [item.elderDeviceId, item._count._all]),
  );

  return {
    caregiver,
    devices: caregiver.bindings.map((binding) => ({
      ...binding,
      elderDevice: {
        ...binding.elderDevice,
        displayName: resolveBindingDisplayName(
          binding.alias,
          binding.elderDevice.displayName,
        ),
      },
      familyUnreadCount: familyUnreadMap.get(binding.elderDeviceId) || 0,
      elderUnreadCount: elderUnreadMap.get(binding.elderDeviceId) || 0,
      bindUrl: createBindUrl(binding.elderDevice.deviceUuid),
    })),
  };
}
