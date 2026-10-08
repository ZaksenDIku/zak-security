import { Newspaper, ArrowRight, GraduationCap } from "lucide-react";
import { getBriefing } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, StatCard } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/Button";
import { CHECK_TYPE_LABELS, type CheckType } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const TONE: Record<string, { card: string; icon: string }> = {
  critical: { card: "border-rose-500/30 bg-rose-500/[0.06]", icon: "text-rose-300" },
  warn: { card: "border-amber-500/30 bg-amber-500/[0.05]", icon: "text-amber-300" },
  info: { card: "border-sky-500/25 bg-sky-500/[0.04]", icon: "text-sky-300" },
  good: { card: "border-emerald-500/25 bg-emerald-500/[0.04]", icon: "text-emerald-300" },
};

export default async function BriefingPage() {
  const briefing = await getBriefing();

  return (
    <>
      <PageHeader
        title="Daily briefing"
        description={`What changed and what deserves attention today — generated from recorded rows only. ${formatDate(briefing.date)}`}
        meta={<span className="text-[11.5px] text-fg-subtle">{briefing.counts.openFindings} open findings in scope</span>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="New findings" value={briefing.counts.newFindings} tone={briefing.counts.newFindings > 0 ? "warn" : "neutral"} />
        <StatCard label="New advisories" value={briefing.counts.newAdvisories} />
        <StatCard label="Checks run" value={briefing.counts.newChecks} />
        <StatCard label="Fixed today" value={briefing.counts.fixedToday} tone="good" />
        <StatCard label="Open" value={briefing.counts.openFindings} />
        <StatCard label="Expiring soon" value={briefing.counts.expiringSoon} tone={briefing.counts.expiringSoon > 0 ? "warn" : "neutral"} />
        <StatCard label="Needs review" value={briefing.counts.needsReview} tone={briefing.counts.needsReview > 0 ? "warn" : "neutral"} />
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Newspaper className="size-4 text-fg-subtle" strokeWidth={2} />
          <h2 className="text-[13px] font-semibold tracking-tight text-fg">Today&apos;s focus</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {briefing.focus.map((line, i) => {
            const tone = TONE[line.tone] ?? TONE.info;
            return (
              <a key={i} href={line.href ?? "#"} className={`card card-hover group flex flex-col gap-1.5 border p-4 ${tone.card}`}>
                <p className="text-[12.5px] leading-snug font-medium text-fg">{line.text}</p>
                <p className="text-[11.5px] leading-relaxed text-fg-muted">{line.why}</p>
                {line.cta ? (
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11.5px] font-medium text-accent">
                    {line.cta}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </span>
                ) : null}
              </a>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader title="Expiring authorizations" />
          {briefing.expiring.length === 0 ? (
            <p className="px-4 py-4 text-[12px] text-fg-subtle">Nothing expires in the next 30 days.</p>
          ) : (
            <ul className="divide-y divide-line">
              {briefing.expiring.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="truncate text-[12.5px] text-fg">{a.asset.name}</span>
                  <Badge className={a.daysLeft <= 3 ? "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30" : "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30"}>
                    {a.daysLeft === 0 ? "today" : `${a.daysLeft}d`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Needs review" description="Not checked in over 14 days." />
          {briefing.needsReview.length === 0 ? (
            <p className="px-4 py-4 text-[12px] text-fg-subtle">Every asset has fresh evidence.</p>
          ) : (
            <ul className="divide-y divide-line">
              {briefing.needsReview.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="truncate text-[12.5px] text-fg">{a.name}</span>
                  <span className="text-[11px] text-fg-subtle">{a.daysSince === null ? "never" : `${a.daysSince}d`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent checks" />
          {briefing.recentChecks.length === 0 ? (
            <p className="px-4 py-4 text-[12px] text-fg-subtle">No checks recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {briefing.recentChecks.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] text-fg">{c.asset.name}</span>
                    <span className="shrink-0 font-mono text-[10.5px] text-fg-subtle">{c.findingsCount} new</span>
                  </div>
                  <p className="text-[11px] text-fg-subtle">
                    {CHECK_TYPE_LABELS[c.checkType as CheckType] ?? c.checkType} · {formatDateTime(c.startedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-5">
        <Card>
          <CardHeader title="Today's learning topic" icon={<GraduationCap className="size-4" />} />
          <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-fg-muted">{briefing.topic}</p>
            <ButtonLink href="/threat-intel" variant="ghost" size="sm">
              Open threat intel
            </ButtonLink>
          </div>
        </Card>
      </section>
    </>
  );
}
