import { ShieldCheck, KeyRound, Database, TriangleAlert, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/Card";
import { Badge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ flash?: string; kind?: string }> }) {
  const { flash, kind } = await searchParams;

  const [assets, demoAssets, findings, demoFindings, advisories, demoAdvisories, leads, demoLeads] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { dataMode: "DEMO" } }),
    prisma.finding.count(),
    prisma.finding.count({ where: { dataMode: "DEMO" } }),
    prisma.threatAdvisory.count(),
    prisma.threatAdvisory.count({ where: { dataMode: "DEMO" } }),
    prisma.securityLead.count(),
    prisma.securityLead.count({ where: { dataMode: "DEMO" } }),
  ]);

  const openai = Boolean(process.env.OPENAI_API_KEY);
  const github = Boolean(process.env.GITHUB_TOKEN);

  return (
    <>
      <PageHeader title="Settings" description="Runtime status, data modes and the safety contract this prototype is built around." />

      {flash ? (
        <div className={`mb-4 flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] ${kind === "error" ? "border-rose-500/30 bg-rose-500/[0.06] text-rose-200" : "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200"}`}>
          {kind === "error" ? <TriangleAlert className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
          {flash}
        </div>
      ) : null}

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Optional providers" description="Zak Security runs fully without any API keys." icon={<KeyRound className="size-4" />} />
          <ul className="divide-y divide-line">
            <ProviderRow label="OpenAI remediation wording" enabled={openai} hint="OPENAI_API_KEY — rewords prose only, never code snippets." />
            <ProviderRow label="GitHub advisory lookups" enabled={github} hint="GITHUB_TOKEN — reserved for authenticated advisory lookups." />
          </ul>
        </Card>

        <Card>
          <CardHeader title="Data modes" description="Demo rows are fictional and always labelled in the UI." icon={<Database className="size-4" />} />
          <ul className="divide-y divide-line text-[12.5px]">
            <ModeRow label="Assets" real={assets - demoAssets} demo={demoAssets} />
            <ModeRow label="Findings" real={findings - demoFindings} demo={demoFindings} />
            <ModeRow label="Advisories" real={advisories - demoAdvisories} demo={demoAdvisories} />
            <ModeRow label="Leads" real={leads - demoLeads} demo={demoLeads} />
          </ul>
          <p className="border-t border-line px-4 py-3 text-[11.5px] leading-relaxed text-fg-subtle">
            Reseed fictional sample data with <span className="font-mono text-fg-muted">npm run db:seed</span>. A fresh database
            starts empty; nothing is fabricated on first run.
          </p>
        </Card>
      </section>

      <section className="mt-5">
        <Card>
          <CardHeader title="Safety contract" description="The properties this prototype will not weaken." icon={<ShieldCheck className="size-4" />} />
          <ul className="grid gap-x-6 gap-y-2.5 px-4 py-4 text-[12.5px] leading-relaxed text-fg-muted sm:grid-cols-2">
            <Contract>Non-intrusive observation only — no brute force, port scanning, fuzzing or auth bypass.</Contract>
            <Contract>At most one HEAD and one GET per target, redirects capped at three hops, 15s hard timeout.</Contract>
            <Contract>Only the first 64 KB of a response body is read, against deterministic patterns.</Contract>
            <Contract>Active checks require an authorization inside its date range; otherwise passive only.</Contract>
            <Contract>No finding is emitted without non-empty evidence and a source.</Contract>
            <Contract>AI agents and MCP servers are reviewed from declared configuration only — never connected to.</Contract>
          </ul>
        </Card>
      </section>
    </>
  );
}

function ProviderRow({ label, enabled, hint }: { label: string; enabled: boolean; hint: string }) {
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-[12.5px] font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-[11px] text-fg-subtle">{hint}</p>
      </div>
      <Badge className={enabled ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-slate-500/12 text-slate-400 ring-1 ring-slate-500/30"}>
        {enabled ? "configured" : "not set"}
      </Badge>
    </li>
  );
}

function ModeRow({ label, real, demo }: { label: string; real: number; demo: number }) {
  return (
    <li className="flex items-center justify-between px-4 py-2.5">
      <span className="text-fg-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-fg">{real}</span>
        <span className="text-[11px] text-fg-subtle">real</span>
        {demo > 0 ? <Badge className="bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30">{demo} demo</Badge> : null}
      </span>
    </li>
  );
}

function Contract({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent/70" strokeWidth={2.2} />
      <span>{children}</span>
    </li>
  );
}
