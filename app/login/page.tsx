import Image from "next/image";
import { redirect } from "next/navigation";

import { AccountAuthForm } from "@/components/account-auth-form";
import { getCaregiverSession, sanitizeCaregiverRedirectPath } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const caregiver = await getCaregiverSession();
  const raw = (await searchParams).redirectTo;
  const redirectTo = sanitizeCaregiverRedirectPath(typeof raw === "string" ? raw : null);
  if (caregiver) redirect(redirectTo);

  return (
    <main className="app-frame" style={{ display: "flex", alignItems: "center" }}>
      <section style={{ width: "100%", padding: "28px 22px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <Image
            src="/app-icon.webp"
            alt="安智伴"
            width={52}
            height={52}
            priority
            style={{ display: "block", borderRadius: 14 }}
          />
          <h1 style={{ margin: "16px 0 0", fontSize: 24, lineHeight: 1.35 }}>安智伴 家属端</h1>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>用同一个账号，在每一台设备上继续守护。长辈的留言、对话与动态都按账号归属。</p>
        </div>
        <AccountAuthForm redirectTo={redirectTo} />
        <p className="muted-note" style={{ textAlign: "center" }}>登录后会自动回到刚才的页面，扫码和绑定流程不用重新开始。</p>
      </section>
    </main>
  );
}
