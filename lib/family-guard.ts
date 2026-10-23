import {
  AlertLevel,
  AlertStatus,
  CareTaskStatus,
  CheckInStatus,
  ContentVisibility,
  FamilyRole,
  MedicationDoseStatus,
  MedicationSource,
  MembershipStatus,
  MemoPriority,
  InvitationStatus,
} from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const ACTIVE_MEMBER = { status: MembershipStatus.ACTIVE } as const;

function requiredText(value: unknown, label: string, max = 500) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}不能为空。`);
  return value.trim().slice(0, max);
}

function optionalText(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function ensureFamilyCircle(caregiverId: string, deviceUuid?: string) {
  const binding = await prisma.deviceBinding.findFirst({
    where: {
      caregiverId,
      elderDevice: deviceUuid ? { deviceUuid } : undefined,
    },
    orderBy: { createdAt: "asc" },
    include: {
      elderDevice: {
        include: { elderProfile: { include: { familyCircle: true } } },
      },
    },
  });
  if (!binding) throw new Error("请先绑定一台长辈设备。 ");

  let circle = binding.elderDevice.elderProfile?.familyCircle;
  if (!circle) {
    circle = await prisma.$transaction(async (tx) => {
      const profile = await tx.elderProfile.upsert({
        where: { elderDeviceId: binding.elderDeviceId },
        update: {},
        create: {
          elderDeviceId: binding.elderDeviceId,
          preferredName: binding.alias || binding.elderDevice.displayName || "长辈",
          consentSetting: { create: {} },
        },
      });
      return tx.familyCircle.upsert({
        where: { elderProfileId: profile.id },
        update: {},
        create: {
          elderProfileId: profile.id,
          createdById: caregiverId,
          name: `${profile.preferredName}的守护圈`,
        },
      });
    });
  }

  const allBindings = await prisma.deviceBinding.findMany({
    where: { elderDeviceId: binding.elderDeviceId },
    orderBy: { createdAt: "asc" },
    select: { caregiverId: true, createdAt: true },
  });
  await prisma.$transaction(
    allBindings.map((item, index) =>
      prisma.familyMembership.upsert({
        where: {
          familyCircleId_caregiverId: {
            familyCircleId: circle!.id,
            caregiverId: item.caregiverId,
          },
        },
        update: { status: MembershipStatus.ACTIVE },
        create: {
          familyCircleId: circle!.id,
          caregiverId: item.caregiverId,
          role: index === 0 ? FamilyRole.ADMIN : FamilyRole.CAREGIVER,
          dutyOrder: index + 1,
        },
      }),
    ),
  );
  return circle;
}

export async function requireCircleMember(caregiverId: string, circleId: string) {
  const member = await prisma.familyMembership.findFirst({
    where: { caregiverId, familyCircleId: circleId, ...ACTIVE_MEMBER },
  });
  if (!member) throw new Error("您不是这个家庭守护圈的成员。");
  return member;
}

export async function getFamilyWorkspace(caregiverId: string, deviceUuid?: string) {
  const circle = await ensureFamilyCircle(caregiverId, deviceUuid);
  await requireCircleMember(caregiverId, circle.id);
  return prisma.familyCircle.findUniqueOrThrow({
    where: { id: circle.id },
    include: {
      elderProfile: { include: { elderDevice: true, consentSetting: true } },
      memberships: {
        where: ACTIVE_MEMBER,
        orderBy: [{ dutyOrder: "asc" }, { createdAt: "asc" }],
        include: { caregiver: { select: { id: true, nickname: true, username: true } } },
      },
      posts: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 30, include: { author: true } },
      memos: { orderBy: [{ priority: "desc" }, { updatedAt: "desc" }], take: 30, include: { author: true } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }], take: 40, include: { createdBy: true, assignedTo: true } },
      medicationPlans: { orderBy: { createdAt: "desc" }, include: { doses: { orderBy: { scheduledFor: "desc" }, take: 14 } } },
      checkIns: { orderBy: { createdAt: "desc" }, take: 20, include: { requestedBy: true } },
      alerts: { orderBy: { createdAt: "desc" }, take: 30, include: { claimedBy: true, safetySignal: true } },
    },
  });
}

function invitationHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createFamilyInvitation(caregiverId: string, input: Record<string, unknown>) {
  const circle = await ensureFamilyCircle(caregiverId, optionalText(input.deviceUuid, 64) || undefined);
  const member = await requireCircleMember(caregiverId, circle.id);
  if (member.role !== FamilyRole.ADMIN) throw new Error("只有管理员可以邀请家庭成员。");
  const token = randomBytes(24).toString("base64url");
  const role = input.role === FamilyRole.CAREGIVER ? FamilyRole.CAREGIVER : FamilyRole.CARING;
  await prisma.familyInvitation.create({
    data: {
      familyCircleId: circle.id,
      createdById: caregiverId,
      tokenHash: invitationHash(token), role,
      relationLabel: optionalText(input.relationLabel, 30),
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    },
  });
  await audit(circle.id, caregiverId, "INVITE", "FamilyMembership", undefined, { role });
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return { inviteUrl: `${baseUrl}/family/join?token=${encodeURIComponent(token)}`, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) };
}

export async function acceptFamilyInvitation(caregiverId: string, token: string) {
  const invitation = await prisma.familyInvitation.findUnique({
    where: { tokenHash: invitationHash(requiredText(token, "邀请口令", 200)) },
    include: { familyCircle: { include: { elderProfile: true } } },
  });
  if (!invitation || invitation.status !== InvitationStatus.PENDING) throw new Error("邀请链接无效或已被使用。");
  if (invitation.expiresAt <= new Date()) {
    await prisma.familyInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.EXPIRED } });
    throw new Error("邀请链接已过期，请让管理员重新邀请。");
  }
  await prisma.$transaction([
    prisma.familyMembership.upsert({
      where: { familyCircleId_caregiverId: { familyCircleId: invitation.familyCircleId, caregiverId } },
      update: { status: MembershipStatus.ACTIVE, role: invitation.role, relationLabel: invitation.relationLabel },
      create: { familyCircleId: invitation.familyCircleId, caregiverId, role: invitation.role, relationLabel: invitation.relationLabel },
    }),
    prisma.deviceBinding.upsert({
      where: { caregiverId_elderDeviceId: { caregiverId, elderDeviceId: invitation.familyCircle.elderProfile.elderDeviceId } },
      update: {}, create: { caregiverId, elderDeviceId: invitation.familyCircle.elderProfile.elderDeviceId },
    }),
    prisma.familyInvitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() } }),
  ]);
  await audit(invitation.familyCircleId, caregiverId, "JOIN", "FamilyMembership");
  return invitation.familyCircle;
}

export async function createFamilyPost(caregiverId: string, input: Record<string, unknown>) {
  const circle = await ensureFamilyCircle(caregiverId, optionalText(input.deviceUuid, 64) || undefined);
  await requireCircleMember(caregiverId, circle.id);
  const visibility = Object.values(ContentVisibility).includes(input.visibility as ContentVisibility)
    ? (input.visibility as ContentVisibility) : ContentVisibility.FAMILY_AND_ELDER;
  const post = await prisma.familyPost.create({
    data: { familyCircleId: circle.id, authorId: caregiverId, content: requiredText(input.content, "动态内容", 1000), visibility },
  });
  await audit(circle.id, caregiverId, "CREATE", "FamilyPost", post.id);
  return post;
}

export async function createFamilyMemo(caregiverId: string, input: Record<string, unknown>) {
  const circle = await ensureFamilyCircle(caregiverId, optionalText(input.deviceUuid, 64) || undefined);
  const member = await requireCircleMember(caregiverId, circle.id);
  if (member.role === FamilyRole.CARING) throw new Error("关怀成员不能修改家庭备忘录。");
  const priority = Object.values(MemoPriority).includes(input.priority as MemoPriority)
    ? (input.priority as MemoPriority) : MemoPriority.NORMAL;
  const memo = await prisma.familyMemo.create({
    data: {
      familyCircleId: circle.id,
      authorId: caregiverId,
      title: requiredText(input.title, "备忘标题", 80),
      content: requiredText(input.content, "备忘内容", 1000),
      priority,
      visibility: input.visibility === ContentVisibility.FAMILY_ONLY ? ContentVisibility.FAMILY_ONLY : ContentVisibility.FAMILY_AND_ELDER,
    },
  });
  await audit(circle.id, caregiverId, "CREATE", "FamilyMemo", memo.id);
  return memo;
}

export async function createCareTask(caregiverId: string, input: Record<string, unknown>) {
  const circle = await ensureFamilyCircle(caregiverId, optionalText(input.deviceUuid, 64) || undefined);
  const member = await requireCircleMember(caregiverId, circle.id);
  if (member.role === FamilyRole.CARING) throw new Error("关怀成员不能创建照护任务。");
  const task = await prisma.careTask.create({
    data: {
      familyCircleId: circle.id,
      createdById: caregiverId,
      title: requiredText(input.title, "任务标题", 100),
      description: optionalText(input.description, 1000),
      dueAt: parseDate(input.dueAt),
    },
  });
  await audit(circle.id, caregiverId, "CREATE", "CareTask", task.id);
  return task;
}

export async function updateCareTask(caregiverId: string, taskId: string, action: string, note?: unknown) {
  const task = await prisma.careTask.findUniqueOrThrow({ where: { id: taskId } });
  await requireCircleMember(caregiverId, task.familyCircleId);
  const data = action === "claim"
    ? { status: CareTaskStatus.CLAIMED, assignedToId: caregiverId }
    : action === "complete"
      ? { status: CareTaskStatus.COMPLETED, assignedToId: task.assignedToId || caregiverId, completedAt: new Date(), completionNote: optionalText(note, 500) }
      : action === "reopen"
        ? { status: CareTaskStatus.OPEN, assignedToId: null, completedAt: null, completionNote: null }
        : null;
  if (!data) throw new Error("不支持的任务操作。");
  const updated = await prisma.careTask.update({ where: { id: taskId }, data });
  await audit(task.familyCircleId, caregiverId, action.toUpperCase(), "CareTask", taskId);
  return updated;
}

function parseTimes(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const times = values.map(String).map((v) => v.trim()).filter((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
  if (!times.length) throw new Error("请至少填写一个 HH:mm 格式的服药时间。");
  return [...new Set(times)].sort();
}

function scheduledDate(dayOffset: number, time: string) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  const [hour, minute] = time.split(":").map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export async function createMedicationPlan(caregiverId: string, input: Record<string, unknown>) {
  const circle = await ensureFamilyCircle(caregiverId, optionalText(input.deviceUuid, 64) || undefined);
  const member = await requireCircleMember(caregiverId, circle.id);
  if (member.role === FamilyRole.CARING) throw new Error("关怀成员不能管理用药计划。");
  const times = parseTimes(input.times);
  const source = Object.values(MedicationSource).includes(input.source as MedicationSource)
    ? (input.source as MedicationSource) : MedicationSource.FAMILY_ENTRY;
  const startDate = parseDate(input.startDate) || new Date();
  const plan = await prisma.medicationPlan.create({
    data: {
      familyCircleId: circle.id,
      createdById: caregiverId,
      name: requiredText(input.name, "药品名称", 100),
      dosage: requiredText(input.dosage, "单次用量", 100),
      instructions: optionalText(input.instructions, 300),
      timesJson: JSON.stringify(times), source, startDate,
      endDate: parseDate(input.endDate),
      stockCount: typeof input.stockCount === "number" ? Math.max(0, Math.floor(input.stockCount)) : null,
      doses: { create: times.flatMap((time) => Array.from({ length: 7 }, (_, day) => ({ scheduledFor: scheduledDate(day, time) }))) },
    },
    include: { doses: true },
  });
  await audit(circle.id, caregiverId, "CREATE", "MedicationPlan", plan.id, { source });
  return plan;
}

export async function createCheckIn(caregiverId: string, input: Record<string, unknown>) {
  const circle = await ensureFamilyCircle(caregiverId, optionalText(input.deviceUuid, 64) || undefined);
  await requireCircleMember(caregiverId, circle.id);
  const checkIn = await prisma.checkInRequest.create({
    data: { familyCircleId: circle.id, requestedById: caregiverId, prompt: optionalText(input.prompt, 240), dueAt: parseDate(input.dueAt) },
  });
  await audit(circle.id, caregiverId, "CREATE", "CheckInRequest", checkIn.id);
  return checkIn;
}

export async function updateAlert(caregiverId: string, alertId: string, action: string, note?: unknown) {
  const alert = await prisma.safetyAlert.findUniqueOrThrow({ where: { id: alertId } });
  await requireCircleMember(caregiverId, alert.familyCircleId);
  const data = action === "claim"
    ? { status: AlertStatus.ACKNOWLEDGED, claimedById: caregiverId, claimedAt: new Date() }
    : action === "resolve"
      ? { status: AlertStatus.RESOLVED, claimedById: alert.claimedById || caregiverId, claimedAt: alert.claimedAt || new Date(), resolvedAt: new Date(), resolutionNote: requiredText(note, "处理结果", 500) }
      : action === "dismiss"
        ? { status: AlertStatus.DISMISSED, claimedById: alert.claimedById || caregiverId, resolvedAt: new Date(), resolutionNote: optionalText(note, 500) || "已确认是误报" }
        : null;
  if (!data) throw new Error("不支持的告警操作。");
  const updated = await prisma.safetyAlert.update({ where: { id: alertId }, data });
  await audit(alert.familyCircleId, caregiverId, action.toUpperCase(), "SafetyAlert", alertId, { note });
  return updated;
}

export async function getDeviceAgenda(deviceUuid: string) {
  const profile = await prisma.elderProfile.findFirst({
    where: { elderDevice: { deviceUuid } },
    include: { familyCircle: true },
  });
  if (!profile?.familyCircle) return { circle: null, posts: [], memos: [], doses: [], checkIns: [] };
  const circleId = profile.familyCircle.id;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const [posts, memos, doses, checkIns] = await Promise.all([
    prisma.familyPost.findMany({ where: { familyCircleId: circleId, visibility: { in: [ContentVisibility.ELDER_ONLY, ContentVisibility.FAMILY_AND_ELDER] }, deliveredAt: null }, include: { author: true }, orderBy: { createdAt: "asc" }, take: 8 }),
    prisma.familyMemo.findMany({ where: { familyCircleId: circleId, visibility: { in: [ContentVisibility.ELDER_ONLY, ContentVisibility.FAMILY_AND_ELDER] } }, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }], take: 12 }),
    prisma.medicationDose.findMany({ where: { medicationPlan: { familyCircleId: circleId, active: true }, scheduledFor: { gte: dayStart, lt: dayEnd }, status: { in: [MedicationDoseStatus.SCHEDULED, MedicationDoseStatus.REMINDING, MedicationDoseStatus.SNOOZED] } }, include: { medicationPlan: true }, orderBy: { scheduledFor: "asc" } }),
    prisma.checkInRequest.findMany({ where: { familyCircleId: circleId, status: CheckInStatus.PENDING }, orderBy: { createdAt: "asc" }, take: 5 }),
  ]);
  if (posts.length) {
    await prisma.familyPost.updateMany({ where: { id: { in: posts.map((post) => post.id) } }, data: { deliveredAt: new Date() } });
  }
  return { circle: profile.familyCircle, posts, memos, doses, checkIns };
}

export async function updateMedicationDose(deviceUuid: string, doseId: string, status: MedicationDoseStatus, note?: unknown, snoozeMinutes = 10) {
  const dose = await prisma.medicationDose.findFirst({ where: { id: doseId, medicationPlan: { familyCircle: { elderProfile: { elderDevice: { deviceUuid } } } } }, include: { medicationPlan: true } });
  if (!dose) throw new Error("没有找到这次服药提醒。");
  if (dose.status === MedicationDoseStatus.TAKEN || dose.status === MedicationDoseStatus.SKIPPED) throw new Error("这次服药已经确认，不能重复提交。");
  return prisma.medicationDose.update({
    where: { id: doseId },
    data: {
      status,
      respondedAt: status === MedicationDoseStatus.SNOOZED ? null : new Date(),
      snoozedUntil: status === MedicationDoseStatus.SNOOZED ? new Date(Date.now() + Math.min(Math.max(snoozeMinutes, 1), 60) * 60_000) : null,
      note: optionalText(note, 500),
    },
  });
}

export async function respondCheckIn(deviceUuid: string, checkInId: string, status: CheckInStatus, responseText?: unknown) {
  const checkIn = await prisma.checkInRequest.findFirst({ where: { id: checkInId, familyCircle: { elderProfile: { elderDevice: { deviceUuid } } }, status: CheckInStatus.PENDING } });
  if (!checkIn) throw new Error("没有找到待回应的报平安请求。");
  return prisma.checkInRequest.update({ where: { id: checkInId }, data: { status, responseText: optionalText(responseText, 500), respondedAt: new Date() } });
}

export async function createSafetyAlertForDevice(deviceUuid: string, input: Record<string, unknown>) {
  const profile = await prisma.elderProfile.findFirst({ where: { elderDevice: { deviceUuid } }, include: { familyCircle: true } });
  if (!profile?.familyCircle) throw new Error("这台设备还没有加入家庭守护圈。");
  const category = requiredText(input.category, "风险类别", 80);
  const summary = requiredText(input.summary, "风险说明", 500);
  const since = new Date(Date.now() - 30 * 60_000);
  const duplicate = await prisma.safetyAlert.findFirst({ where: { familyCircleId: profile.familyCircle.id, status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] }, safetySignal: { category, createdAt: { gte: since } } }, orderBy: { createdAt: "desc" } });
  if (duplicate) return { alert: duplicate, deduplicated: true };
  const level = Object.values(AlertLevel).includes(input.level as AlertLevel) ? (input.level as AlertLevel) : AlertLevel.ORANGE;
  const signal = await prisma.safetySignal.create({ data: { familyCircleId: profile.familyCircle.id, category, summary, contextText: optionalText(input.contextText, 1000), confidence: typeof input.confidence === "number" ? Math.min(Math.max(input.confidence, 0), 1) : null } });
  const alert = await prisma.safetyAlert.create({ data: { familyCircleId: profile.familyCircle.id, safetySignalId: signal.id, level, title: requiredText(input.title, "提醒标题", 100), summary } });
  return { alert, deduplicated: false };
}

async function audit(circleId: string, actorId: string | null, action: string, entityType: string, entityId?: string, detail?: unknown) {
  await prisma.auditLog.create({ data: { familyCircleId: circleId, actorId, action, entityType, entityId, detailJson: detail === undefined ? null : JSON.stringify(detail) } });
}
