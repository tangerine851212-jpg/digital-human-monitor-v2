import { MessageDirection, MessageStatus } from "@prisma/client";

import { createBindUrl, getCaregiverDashboard } from "@/lib/monitor-data";
import { prisma } from "@/lib/prisma";

const deviceSummarySelect = {
  id: true,
  deviceUuid: true,
  displayName: true,
  appVersion: true,
  lastSeenAt: true,
} as const;

async function loadCaregiverDeviceNameMap(
  caregiverId: string,
  elderDeviceIds: string[],
) {
  if (elderDeviceIds.length === 0) {
    return new Map<string, string>();
  }

  const bindings = await prisma.deviceBinding.findMany({
    where: {
      caregiverId,
      elderDeviceId: {
        in: elderDeviceIds,
      },
    },
    select: {
      elderDeviceId: true,
      alias: true,
      elderDevice: {
        select: {
          displayName: true,
        },
      },
    },
  });

  return new Map(
    bindings
      .map((binding) => [
        binding.elderDeviceId,
        binding.alias?.trim() || binding.elderDevice.displayName?.trim() || "",
      ] as const)
      .filter((entry) => entry[1].length > 0),
  );
}

function applyCaregiverDeviceNames<
  T extends {
    elderDeviceId: string;
    elderDevice: {
      displayName: string | null;
    };
  },
>(items: T[], deviceNameMap: Map<string, string>) {
  items.forEach((item) => {
    const resolvedName = deviceNameMap.get(item.elderDeviceId);

    if (resolvedName) {
      item.elderDevice.displayName = resolvedName;
    }
  });

  return items;
}

export async function getCaregiverOverview(caregiverId: string) {
  const dashboard = await getCaregiverDashboard(caregiverId);

  const [recentIncomingMessages, recentOutgoingMessages] = await prisma.$transaction([
    prisma.familyMessage.findMany({
      where: {
        direction: MessageDirection.ELDER_TO_FAMILY,
        elderDevice: {
          bindings: {
            some: { caregiverId },
          },
        },
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.familyMessage.findMany({
      where: {
        direction: MessageDirection.FAMILY_TO_ELDER,
        caregiverId,
        elderDevice: {
          bindings: {
            some: { caregiverId },
          },
        },
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const deviceNameMap = new Map(
    dashboard.devices
      .map((device) => [device.elderDeviceId, device.elderDevice.displayName?.trim() || ""] as const)
      .filter((entry) => entry[1].length > 0),
  );

  applyCaregiverDeviceNames(recentIncomingMessages, deviceNameMap);
  applyCaregiverDeviceNames(recentOutgoingMessages, deviceNameMap);

  return {
    dashboard,
    recentIncomingMessages,
    recentOutgoingMessages,
  };
}

export function getCaregiverUnreadIncomingCount(caregiverId: string) {
  return prisma.familyMessage.count({
    where: {
      direction: MessageDirection.ELDER_TO_FAMILY,
      elderDevice: {
        bindings: {
          some: { caregiverId },
        },
      },
      readAt: null,
    },
  });
}

export async function getCaregiverMessages(caregiverId: string) {
  const [messages, unreadIncomingCount, unreadOutgoingCount] = await prisma.$transaction([
    prisma.familyMessage.findMany({
      where: {
        elderDevice: {
          bindings: {
            some: { caregiverId },
          },
        },
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
      orderBy: [{ createdAt: "desc" }, { publicId: "desc" }],
      take: 120,
    }),
    getCaregiverUnreadIncomingCount(caregiverId),
    prisma.familyMessage.count({
      where: {
        direction: MessageDirection.FAMILY_TO_ELDER,
        caregiverId,
        elderDevice: {
          bindings: {
            some: { caregiverId },
          },
        },
        readAt: null,
      },
    }),
  ]);

  const deviceNameMap = await loadCaregiverDeviceNameMap(
    caregiverId,
    [...new Set(messages.map((message) => message.elderDeviceId))],
  );

  applyCaregiverDeviceNames(messages, deviceNameMap);

  return {
    messages,
    unreadIncomingCount,
    unreadOutgoingCount,
  };
}

export async function getCaregiverMessageDetail(
  caregiverId: string,
  publicId: number,
) {
  let message = await prisma.familyMessage.findFirst({
    where: {
      publicId,
      elderDevice: {
        bindings: {
          some: { caregiverId },
        },
      },
    },
    include: {
      elderDevice: {
        select: deviceSummarySelect,
      },
    },
  });

  if (!message) {
    return null;
  }

  if (message.direction === MessageDirection.ELDER_TO_FAMILY && !message.readAt) {
    const now = new Date();
    message = await prisma.familyMessage.update({
      where: { id: message.id },
      data: {
        readAt: now,
        deliveredAt: message.deliveredAt ?? now,
        status: MessageStatus.READ,
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
    });
  }

  const deviceNameMap = await loadCaregiverDeviceNameMap(caregiverId, [message.elderDeviceId]);
  applyCaregiverDeviceNames([message], deviceNameMap);

  return message;
}

export async function getCaregiverDevices(caregiverId: string) {
  const dashboard = await getCaregiverDashboard(caregiverId);

  return dashboard.devices;
}

export async function getCaregiverDeviceDetail(
  caregiverId: string,
  deviceUuid: string,
) {
  const binding = await prisma.deviceBinding.findFirst({
    where: {
      caregiverId,
      elderDevice: {
        deviceUuid,
      },
    },
    include: {
      elderDevice: {
        include: {
          messages: {
            orderBy: [{ createdAt: "desc" }, { publicId: "desc" }],
            take: 14,
          },
          usageEvents: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          conversationTurns: {
            orderBy: { createdAt: "desc" },
            take: 12,
          },
          toolCalls: {
            orderBy: { createdAt: "desc" },
            take: 8,
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
  });

  if (!binding) {
    return null;
  }

  const [familyUnreadCount, elderUnreadCount] = await prisma.$transaction([
    prisma.familyMessage.count({
      where: {
        elderDeviceId: binding.elderDeviceId,
        direction: MessageDirection.FAMILY_TO_ELDER,
        readAt: null,
      },
    }),
    prisma.familyMessage.count({
      where: {
        elderDeviceId: binding.elderDeviceId,
        direction: MessageDirection.ELDER_TO_FAMILY,
        readAt: null,
      },
    }),
  ]);

  return {
    ...binding,
    elderDevice: {
      ...binding.elderDevice,
      displayName:
        binding.alias?.trim() || binding.elderDevice.displayName?.trim() || null,
    },
    bindUrl: createBindUrl(binding.elderDevice.deviceUuid),
    familyUnreadCount,
    elderUnreadCount,
  };
}

export async function getCaregiverActivity(caregiverId: string) {
  const deviceBindings = await prisma.deviceBinding.findMany({
    where: { caregiverId },
    select: {
      elderDeviceId: true,
    },
  });

  const elderDeviceIds = deviceBindings.map((binding) => binding.elderDeviceId);

  if (elderDeviceIds.length === 0) {
    return {
      usageEvents: [],
      conversationTurns: [],
      toolCalls: [],
    };
  }

  const [usageEvents, conversationTurns, toolCalls] = await prisma.$transaction([
    prisma.usageEvent.findMany({
      where: {
        elderDeviceId: { in: elderDeviceIds },
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.conversationTurn.findMany({
      where: {
        elderDeviceId: { in: elderDeviceIds },
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.toolCallLog.findMany({
      where: {
        elderDeviceId: { in: elderDeviceIds },
      },
      include: {
        elderDevice: {
          select: deviceSummarySelect,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);

  const deviceNameMap = await loadCaregiverDeviceNameMap(caregiverId, elderDeviceIds);

  applyCaregiverDeviceNames(usageEvents, deviceNameMap);
  applyCaregiverDeviceNames(conversationTurns, deviceNameMap);
  applyCaregiverDeviceNames(toolCalls, deviceNameMap);

  return {
    usageEvents,
    conversationTurns,
    toolCalls,
  };
}

export async function getCaregiverSettingsOverview(caregiverId: string) {
  const [deviceCount, pushSubscriptionCount] = await prisma.$transaction([
    prisma.deviceBinding.count({
      where: { caregiverId },
    }),
    prisma.pushSubscription.count({
      where: { caregiverId },
    }),
  ]);

  return {
    deviceCount,
    pushSubscriptionCount,
  };
}
