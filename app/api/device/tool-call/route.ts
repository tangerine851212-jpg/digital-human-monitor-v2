import { ToolCallStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { recordToolCall } from "@/lib/monitor-data";
import { requireDeviceAuth } from "@/lib/device-auth";

function toToolCallStatus(rawStatus: unknown) {
  return rawStatus === ToolCallStatus.FAILURE
    ? ToolCallStatus.FAILURE
    : ToolCallStatus.SUCCESS;
}

function toArguments(rawArguments: unknown) {
  if (
    rawArguments &&
    typeof rawArguments === "object" &&
    !Array.isArray(rawArguments)
  ) {
    return rawArguments as Record<string, unknown>;
  }

  return {};
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        toolName?: string;
        arguments?: unknown;
        outputText?: string;
        status?: string;
        callId?: string;
        sessionId?: string;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "deviceUuid 是必填项。" },
      { status: 400 },
    );
  }

  if (!body.toolName || typeof body.toolName !== "string") {
    return NextResponse.json(
      { error: "toolName 是必填项。" },
      { status: 400 },
    );
  }

  try {
    await requireDeviceAuth(request, body.deviceUuid);
    const log = await recordToolCall({
      deviceUuid: body.deviceUuid,
      toolName: body.toolName,
      arguments: toArguments(body.arguments),
      outputText: typeof body.outputText === "string" ? body.outputText : undefined,
      status: toToolCallStatus(body.status),
      callId: typeof body.callId === "string" ? body.callId : undefined,
      sessionId:
        typeof body.sessionId === "string" ? body.sessionId : undefined,
    });

    return NextResponse.json({ ok: true, logId: log.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "工具调用记录失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
