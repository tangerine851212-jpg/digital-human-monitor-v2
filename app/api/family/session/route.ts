import { type NextRequest, NextResponse } from "next/server";

import {
  buildCaregiverLoginPath,
  getCaregiverSession,
  sanitizeCaregiverRedirectPath,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  const redirectTo = sanitizeCaregiverRedirectPath(
    request.nextUrl.searchParams.get("redirectTo"),
  );
  const caregiver = await getCaregiverSession();
  const location = caregiver ? redirectTo : buildCaregiverLoginPath(redirectTo);

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: location,
    },
  });
}