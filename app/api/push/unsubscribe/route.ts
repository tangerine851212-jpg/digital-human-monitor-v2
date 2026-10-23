import { NextResponse } from "next/server";

import { removePushSubscription } from "@/lib/push";
import { getCaregiverSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
      }
    | null;

  if (!body?.endpoint || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint 是必填项。" }, { status: 400 });
  }

  const caregiver = await getCaregiverSession();

  if (!caregiver) {
    return NextResponse.json({ ok: true });
  }

  await removePushSubscription({
    caregiverId: caregiver.id,
    endpoint: body.endpoint,
  });

  return NextResponse.json({ ok: true });
}