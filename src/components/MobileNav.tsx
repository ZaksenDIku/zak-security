"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/assets", label: "Assets" },
  { href: "/authorizations", label: "Authorizations" },
  { href: "/findings", label: "Findings" },
  { href: "/threat-intel", label: "Threat Intel" },
  { href: "/remediation", label: "AI Remediation" },
  { href: "/leads", label: "Security Leads" },
  { href: "/briefing", label: "Daily Briefing" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle navigation"
        className="inline-flex size-8 items-center justify-center rounded-lg bg-panel-2 text-fg-muted ring-1 ring-line-strong"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-panel p-2 shadow-2xl">
          <ul className="grid grid-cols-2 gap-1">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-[13px] font-medium",
                      active ? "bg-panel-2 text-fg ring-1 ring-line-strong" : "text-fg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function BrandMark() {
  return (
    <span className="flex size-6 items-center justify-center rounded-md bg-accent/15 ring-1 ring-accent/25">
      <ShieldCheck className="size-3.5 text-accent" strokeWidth={2.2} />
    </span>
  );
}
