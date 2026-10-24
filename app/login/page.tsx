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
    <main className="app-frame login-frame">
      <header className="login-hero">
        <div className="login-hero-copy">
          <h1>
            欢迎进入
            <span>安智伴 家属端</span>
          </h1>
          <p>用同一个账号，继续守护家人的每一次对话。</p>
        </div>

        <div className="login-hero-visual" aria-hidden="true">
          <span className="login-hero-halo" />
          <div className="login-portrait">
            <Image
              src="/login-digital-human.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 430px) 45vw, 190px"
              style={{ objectFit: "cover", objectPosition: "center top" }}
            />
          </div>
          <span className="login-hero-dot login-hero-dot-one" />
          <span className="login-hero-dot login-hero-dot-two" />
        </div>
      </header>

      <section className="login-sheet">
        <div className="login-sheet-head">
          <Image
            src="/app-icon.webp"
            alt="安智伴"
            width={36}
            height={36}
            priority
            style={{ display: "block", borderRadius: 11 }}
          />
          <div>
            <h2>登录账号</h2>
            <p>继续查看留言、陪伴动态和守护信息</p>
          </div>
        </div>

        <AccountAuthForm redirectTo={redirectTo} />
        <p className="muted-note" style={{ textAlign: "center", marginTop: 4 }}>
          登录后会自动回到刚才的页面，扫码和绑定流程不用重新开始。
        </p>
      </section>
    </main>
  );
}
