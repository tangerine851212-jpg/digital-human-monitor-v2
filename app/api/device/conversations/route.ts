import { ConversationRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { recordConversationTurns } from "@/lib/monitor-data";
import { requireDeviceAuth } from "@/lib/device-auth";

function toConversationRole(rawRole: unknown) {
  switch (rawRole) {
    case ConversationRole.USER:
      return ConversationRole.USER;
    case ConversationRole.TOOL:
      return ConversationRole.TOOL;
    default:
      return ConversationRole.ASSISTANT;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        deviceUuid?: string;
        sessionId?: string;
        turns?: unknown;
      }
    | null;

  if (!body?.deviceUuid || typeof body.deviceUuid !== "string") {
    return NextResponse.json(
      { error: "deviceUuid 是必填项。" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.turns)) {
    return NextResponse.json(
      { error: "turns 必须是数组。" },
      { status: 400 },
    );
  }

  const turns = body.turns
    .filter((turn): turn is Record<string, unknown> => !!turn && typeof turn === "object")
    .map((turn) => ({
      role: toConversationRole(turn.role),
      content: typeof turn.content === "string" ? turn.content : "",
      metaJson: typeof turn.metaJson === "string" ? turn.metaJson : undefined,
      createdAt: typeof turn.createdAt === "string" ? turn.createdAt : undefined,
    }))
    .filter((turn) => turn.content.trim().length > 0);

  if (turns.length === 0) {
    return NextResponse.json(
      { error: "至少需要一条有效对话内容。" },
      { status: 400 },
    );
  }

  try {
    await requireDeviceAuth(request, body.deviceUuid);
    const result = await recordConversationTurns({
      deviceUuid: body.deviceUuid,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      turns,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "对话记录保存失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}
