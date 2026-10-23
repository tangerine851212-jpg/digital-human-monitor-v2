import {
  ConversationRole,
  MessageDirection,
  MessageImportance,
  MessageStatus,
  UsageEventType,
} from "@prisma/client";

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "暂时还没有记录";
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getImportanceLabel(level: MessageImportance | string) {
  switch (level) {
    case MessageImportance.LOW:
      return "温和提醒";
    case MessageImportance.HIGH:
      return "希望尽快看到";
    case MessageImportance.URGENT:
      return "需要尽快联系";
    default:
      return "日常问候";
  }
}

export function getUsageLabel(eventType: UsageEventType | string) {
  switch (eventType) {
    case UsageEventType.APP_OPEN:
      return "打开了老人端应用";
    case UsageEventType.SETTINGS_OPENED:
      return "查看了设置页面";
    case UsageEventType.AI_SESSION_STARTED:
      return "开始了一次陪伴对话";
    case UsageEventType.AI_SESSION_ENDED:
      return "结束了一次陪伴对话";
    case UsageEventType.CAMERA_ENABLED:
      return "打开了镜头模式";
    case UsageEventType.CAMERA_DISABLED:
      return "关闭了镜头模式";
    case UsageEventType.TOOL_CALLED:
      return "使用了一项智能服务";
    default:
      return eventType;
  }
}

export function getConversationRoleLabel(role: ConversationRole | string) {
  switch (role) {
    case ConversationRole.USER:
      return "老人说";
    case ConversationRole.TOOL:
      return "智能助理";
    default:
      return "数字人回复";
  }
}

export function getMessageDirectionLabel(direction: MessageDirection | string) {
  return direction === MessageDirection.ELDER_TO_FAMILY
    ? "老人给家里"
    : "家属给老人";
}

export function getMessageStatusLabel(input: {
  direction: MessageDirection | string;
  status: MessageStatus | string;
  readAt?: Date | string | null;
  deliveredAt?: Date | string | null;
}) {
  if (input.direction === MessageDirection.ELDER_TO_FAMILY) {
    return input.readAt ? "家属已打开" : "等待家属查看";
  }

  if (input.readAt) {
    return "老人已看过";
  }

  if (input.deliveredAt) {
    return "已送到老人设备";
  }

  if (input.status === MessageStatus.PENDING) {
    return "等待老人设备拉取";
  }

  return "等待老人查看";
}

export function truncateText(content: string, maxLength = 88) {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, maxLength).trimEnd()}...`;
}

export function getMessageHref(publicId: number) {
  return `/messages/${publicId}`;
}

export function getDeviceName(
  primaryName?: string | null,
  fallbackName?: string | null,
) {
  return primaryName?.trim() || fallbackName?.trim() || "长辈的设备";
}