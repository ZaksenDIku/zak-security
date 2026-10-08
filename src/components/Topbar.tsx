import Link from "next/link";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/Badge";
import { MobileNav, BrandMark } from "@/components/MobileNav";

export async function Topbar() {
  const [assets, openFindings, critical, demoRecords] = await Promise.all([
    prisma.asset.count(),
    prisma.finding.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.finding.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, severity: "CRITICAL" } }),
    prisma.asset.count({ where: { dataMode: "DEMO" } }),
  ]);

  const hasDemo = demoRecords > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex h-13 items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <MobileNav />
        <div className="flex items-center gap-2 md:hidden">
          <BrandMark />
          <span className="text-[13px] font-semibold tracking-tight text-fg">Zak Security</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasDemo ? (
            <Badge
              className="bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30"
              title="This prototype is seeded with fictional sample records. Every demo record is tagged DEMO in the database."
            >
              DEMO DATA
            </Badge>
          ) : null}

          <div className="hidden items-center gap-3 rounded-lg bg-panel/70 px-3 py-1.5 ring-1 ring-line sm:flex">
            <Metric label="Assets" value={assets} href="/assets" />
            <span className="h-3.5 w-px bg-line-strong" />
            <Metric label="Open" value={openFindings} href="/findings" />
            <span className="h-3.5 w-px bg-line-strong" />
            <Metric
              label="Critical"
              value={critical}
              href="/findings"
              tone={critical > 0 ? "text-rose-300" : undefined}
            />
          </div>

          <Link
            href="/authorizations"
            className="inline-flex items-center gap-1.5 rounded-lg bg-panel-2 px-2.5 py-1.5 text-[11.5px] font-medium text-fg-muted ring-1 ring-line-strong transition-colors hover:text-fg"
            title="Active tests are only permitted for authorized assets."
          >
            <Lock className="size-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">Scope enforced</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Metric({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone?: string;
}) {
  return (
    <Link href={href} className="flex items-baseline gap-1.5 transition-opacity hover:opacity-75">
      <span className={`font-mono text-[13px] leading-none font-semibold tabular-nums ${tone ?? "text-fg"}`}>
        {value}
      </span>
      <span className="text-[10.5px] tracking-wide text-fg-subtle uppercase">{label}</span>
    </Link>
  );
}
