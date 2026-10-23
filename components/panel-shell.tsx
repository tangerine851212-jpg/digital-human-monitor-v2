import Link from "next/link";
import { ChevronLeft, HeartHandshake, House, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { getCaregiverUnreadIncomingCount } from "@/lib/caregiver-panel";

const navigationItems = [
  { href: "/guard", label: "守护", icon: ShieldCheck },
  { href: "/family", label: "家庭", icon: House },
  { href: "/care", label: "照护", icon: Stethoscope },
  { href: "/companion", label: "陪伴", icon: HeartHandshake },
  { href: "/settings", label: "我的", icon: UserRound },
];

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

type PanelShellProps = {
  currentPath: string;
  title: string;
  description?: string;
  caregiverLabel: string;
  caregiverId?: string;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  showTabs?: boolean;
  unreadCount?: number;
};

export async function PanelShell({
  currentPath,
  title,
  description,
  caregiverLabel,
  caregiverId,
  children,
  actions,
  backHref,
  showTabs = !backHref,
  unreadCount,
}: PanelShellProps) {
  const initial = caregiverLabel.trim().slice(-1) || "安";
  const resolvedUnreadCount = unreadCount ?? (showTabs && caregiverId
    ? await getCaregiverUnreadIncomingCount(caregiverId)
    : 0);

  return (
    <main className="app-frame">
      <div className={`app-content app-stack${backHref ? " detail" : ""}`}>
        {backHref ? (
          <header className="detail-header">
            <Link href={backHref} className="back-button" aria-label="返回">
              <ChevronLeft size={20} strokeWidth={2} />
            </Link>
            <h1>{title}</h1>
            {actions}
          </header>
        ) : (
          <header className="page-heading">
            <div>
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {actions ?? (
              <Link href="/settings" className="avatar" aria-label="我的">
                {initial}
              </Link>
            )}
          </header>
        )}

        {children}
      </div>

      {showTabs ? (
        <nav className="bottom-nav" aria-label="主导航">
          {navigationItems.map((item) => {
            const active = isActivePath(currentPath, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
                <Icon size={22} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.href === "/family" && resolvedUnreadCount > 0 ? <span className="nav-badge">{resolvedUnreadCount}</span> : null}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </main>
  );
}
