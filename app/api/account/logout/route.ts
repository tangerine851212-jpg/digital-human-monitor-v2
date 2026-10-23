import { NextResponse } from "next/server";

import { clearCurrentCaregiverSession } from "@/lib/session";

export async function POST() {
  await clearCurrentCaregiverSession();

  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: "/login",
    },
  });
}