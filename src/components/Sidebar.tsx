"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  FileCheck2,
  ShieldAlert,
  Radar,
  WandSparkles,
  Users,
  Newspaper,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/authorizations", label: "Authorizations", icon: FileCheck2 },
  { href: "/findings", label: "Findings", icon: ShieldAlert },
  { href: "/threat-intel", label: "Threat Intel", icon: Radar },
  { href: "/remediation", label: "AI Remediation", icon: WandSparkles },
  { href: "/leads", label: "Security Leads", icon: Users },
  { href: "/briefing", label: "Daily Briefing", icon: Newspaper },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-[228px] shrink-0 flex-col border-r border-line bg-panel/80 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/25">
          <ShieldCheck className="size-4 text-accent" strokeWidth={2.1} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] leading-tight font-semibold tracking-tight text-fg">
            Zak Security
          </div>
          <div className="truncate text-[10.5px] text-fg-subtle">Authorized work only</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-medium transition-colors",
                    active
                      ? "bg-panel-2 text-fg ring-1 ring-line-strong"
                      : "text-fg-muted hover:bg-panel-2/60 hover:text-fg"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[15px] shrink-0",
                      active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted"
                    )}
                    strokeWidth={1.9}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="rounded-lg bg-panel-2/60 p-2.5 ring-1 ring-line">
          <p className="text-[10.5px] leading-relaxed font-medium tracking-wide text-fg-muted uppercase">
            White-hat scope
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-subtle">
            Passive and configuration review only. No exploitation, no credential attacks, no port
            scanning.
          </p>
        </div>
      </div>
    </aside>
  );
}
