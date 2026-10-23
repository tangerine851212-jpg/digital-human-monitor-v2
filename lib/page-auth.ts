import { redirect } from "next/navigation";

import {
  buildCaregiverLoginPath,
  getCaregiverSession,
} from "@/lib/session";

export async function requireCaregiverSession(redirectTo: string) {
  const caregiver = await getCaregiverSession();

  if (!caregiver) {
    redirect(buildCaregiverLoginPath(redirectTo));
  }

  return caregiver;
}