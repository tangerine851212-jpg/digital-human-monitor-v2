import { redirect } from "next/navigation";
import { getFamilyWorkspace } from "@/lib/family-guard";

export async function requireFamilyWorkspace(caregiverId: string) {
  try {
    return await getFamilyWorkspace(caregiverId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("绑定一台长辈设备")) redirect("/devices");
    throw error;
  }
}
