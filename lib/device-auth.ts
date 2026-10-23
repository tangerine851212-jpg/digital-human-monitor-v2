import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function readDeviceToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-device-token")?.trim() || "";
}

export async function requireDeviceAuth(request: Request, deviceUuid: string) {
  const token = readDeviceToken(request);
  if (!token) throw new Error("设备认证信息缺失，请重新注册设备。");
  const device = await prisma.elderDevice.findUnique({ where: { deviceUuid }, select: { id: true, deviceUuid: true, deviceTokenHash: true } });
  if (!device?.deviceTokenHash) throw new Error("设备尚未完成安全注册。");
  const actual = Buffer.from(hashDeviceToken(token));
  const expected = Buffer.from(device.deviceTokenHash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("设备认证失败，请重新注册设备。");
  return device;
}
