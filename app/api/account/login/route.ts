import { NextResponse } from "next/server";

import {
  loginCaregiverAccount,
  sanitizeCaregiverRedirectPath,
} from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        username?: string;
        password?: string;
        redirectTo?: string;
      }
    | null;

  if (!body?.username || typeof body.username !== "string") {
    return NextResponse.json({ error: "请先输入用户名。" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json({ error: "请先输入密码。" }, { status: 400 });
  }

  try {
    await loginCaregiverAccount({
      username: body.username,
      password: body.password,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      redirectTo: sanitizeCaregiverRedirectPath(body.redirectTo),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "登录失败，请稍后再试。",
      },
      { status: 400 },
    );
  }
}