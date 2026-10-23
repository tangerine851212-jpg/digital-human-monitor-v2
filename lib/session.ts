import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const CAREGIVER_SESSION_COOKIE = "dh-caregiver-session";

const CAREGIVER_SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const CAREGIVER_USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,23}$/;
const CAREGIVER_PASSWORD_MIN_LENGTH = 8;

function createSessionToken() {
  return randomUUID().replaceAll("-", "");
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CAREGIVER_SESSION_MAX_AGE,
  };
}

function normalizeRedirectPath(redirectTo?: string) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}

function normalizeCaregiverUsername(rawValue: string) {
  return rawValue.trim().toLowerCase();
}

function parseCaregiverUsername(rawValue: string) {
  const username = normalizeCaregiverUsername(rawValue);

  if (!CAREGIVER_USERNAME_PATTERN.test(username)) {
    throw new Error("用户名请使用 3 到 24 位字母、数字、下划线或横线。");
  }

  return username;
}

function parseCaregiverPassword(rawValue: string) {
  if (rawValue.length < CAREGIVER_PASSWORD_MIN_LENGTH) {
    throw new Error(`密码至少需要 ${CAREGIVER_PASSWORD_MIN_LENGTH} 位。`);
  }

  if (rawValue.length > 72) {
    throw new Error("密码请控制在 72 位以内。");
  }

  return rawValue;
}

async function getCurrentSessionToken() {
  return (await cookies()).get(CAREGIVER_SESSION_COOKIE)?.value || null;
}

async function createCaregiverSession(input: {
  caregiverId: string;
  userAgent?: string | null;
}) {
  const currentSessionToken = await getCurrentSessionToken();

  if (currentSessionToken) {
    await prisma.caregiverSession.deleteMany({
      where: {
        sessionToken: currentSessionToken,
      },
    });
  }

  const sessionToken = createSessionToken();

  await prisma.caregiverSession.create({
    data: {
      caregiverId: input.caregiverId,
      sessionToken,
      userAgent: input.userAgent?.trim() || null,
      lastSeenAt: new Date(),
    },
  });

  (await cookies()).set(CAREGIVER_SESSION_COOKIE, sessionToken, getCookieOptions());
}

export function buildCaregiverLoginPath(redirectTo: string) {
  const normalizedRedirect = normalizeRedirectPath(redirectTo);
  return `/login?redirectTo=${encodeURIComponent(normalizedRedirect)}`;
}

export function getCaregiverDisplayName(input: {
  username?: string | null;
  nickname?: string | null;
}) {
  return input.nickname?.trim() || input.username?.trim() || "临时账号";
}

export function sanitizeCaregiverRedirectPath(redirectTo?: string | null) {
  return normalizeRedirectPath(redirectTo || undefined);
}

export async function getCaregiverSession() {
  const sessionToken = await getCurrentSessionToken();

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.caregiverSession.findUnique({
    where: { sessionToken },
    include: {
      caregiver: true,
    },
  });

  if (!session) {
    return null;
  }

  return session.caregiver;
}

export async function registerCaregiverAccount(input: {
  username: string;
  password: string;
  userAgent?: string | null;
}) {
  const username = parseCaregiverUsername(input.username);
  const password = parseCaregiverPassword(input.password);
  const existingCaregiver = await prisma.caregiverAccount.findUnique({
    where: { username },
  });

  if (existingCaregiver) {
    throw new Error("这个用户名已经被注册了，请直接登录。");
  }

  const caregiver = await prisma.caregiverAccount.create({
    data: {
      username,
      passwordHash: await hash(password, 10),
    },
  });

  await createCaregiverSession({
    caregiverId: caregiver.id,
    userAgent: input.userAgent,
  });

  return caregiver;
}

export async function loginCaregiverAccount(input: {
  username: string;
  password: string;
  userAgent?: string | null;
}) {
  const username = parseCaregiverUsername(input.username);
  const password = parseCaregiverPassword(input.password);
  const caregiver = await prisma.caregiverAccount.findUnique({
    where: { username },
  });

  if (!caregiver?.passwordHash) {
    throw new Error("用户名或密码不正确。");
  }

  const passwordMatched = await compare(password, caregiver.passwordHash);

  if (!passwordMatched) {
    throw new Error("用户名或密码不正确。");
  }

  await createCaregiverSession({
    caregiverId: caregiver.id,
    userAgent: input.userAgent,
  });

  return caregiver;
}

export async function clearCurrentCaregiverSession() {
  const sessionToken = await getCurrentSessionToken();

  if (sessionToken) {
    await prisma.caregiverSession.deleteMany({
      where: {
        sessionToken,
      },
    });
  }

  (await cookies()).delete(CAREGIVER_SESSION_COOKIE);
}