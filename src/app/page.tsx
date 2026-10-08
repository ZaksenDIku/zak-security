import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Boxes,
  FileCheck2,
  Radar,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { getOverview } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { StatCard, Card, CardHeader, EmptyState } from "@/components/Card";
import { Badge, Dot, DemoBadge } from "@/components/Badge";
import { Table, Th, Td, Tr } from "@/components/Table";
import { ButtonLink } from "@/components/Button";
import { TIER_STYLES, type PriorityTier } from "@/lib/priority";
import {
  SEVERITY_STYLES,
  AUTH_STATUS_STYLES,
  ASSET_TYPE_STYLES,
  type Severity,
  type AssetType,
} from "@/lib/constants";
import { formatDate, relativeDays, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const TONE_STYLES: Record<"critical" | "warn" | "info", string> = {
  critical: "border-rose-500/30 bg-rose-500/[0.06]",
  warn: "border-amber-500/30 bg-amber-500/[0.05]",
  info: "border-sky-500/25 bg-sky-500/[0.04]",
};

const TONE_ICON: Record<"critical" | "warn" | "info", string> = {
  critical: "text-rose-300",
  warn: "text-amber-300",
  info: "text-sky-300",
};

export default async function OverviewPage() {
  const overview = await getOverview();
  const { stats, attention, priorityQueue, activity, recentlyFixed, expiring } = overview;

  return (
    <>
      <PageHeader
        title="Security posture"
        description="Discover, authorize, observe, verify, prioritize, fix, re-test. Every number and every finding on this page is traceable back to a row in the database — nothing here is inferred beyond the recorded evidence."
        meta={
          <>
            <Badge className={AUTH_STATUS_STYLES.ACTIVE}>
              <LockDot /> Scope enforced
            </Badge>
            <span className="text-[11.5px] text-fg-subtle">
              {stats.authorizedAssets} of {stats.assets} assets authorized
            </span>
          </>
        }
        action={
          <ButtonLink href="/assets" variant="primary">
            <Boxes className="size-3.5" strokeWidth={2} />
            Open assets
          </ButtonLink>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Assets" value={stats.assets} href="/assets" icon={<Boxes className="size-4" />} hint={`${stats.authorizedAssets} authorized`} />
        <StatCard
          label="Not authorized"
          value={stats.notAuthorized}
          tone={stats.notAuthorized > 0 ? "warn" : "good"}
          href="/authorizations"
          icon={<FileCheck2 className="size-4" />}
          hint="Passive inspection only"
        />
        <StatCard
          label="Open findings"
          value={stats.openFindings}
          tone={stats.openFindings > 0 ? "warn" : "good"}
          href="/findings"
          icon={<ShieldAlert className="size-4" />}
          hint={`${stats.recentlyFixed} fixed recently`}
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          tone={stats.critical > 0 ? "danger" : "neutral"}
          href="/findings"
          icon={<ShieldAlert className="size-4" />}
          hint={`${stats.high} high severity`}
        />
        <StatCard
          label="Known exploited"
          value={stats.knownExploited}
          tone={stats.knownExploited > 0 ? "danger" : "good"}
          href="/threat-intel"
          icon={<Radar className="size-4" />}
          hint={`${stats.advisories} advisories tracked`}
        />
        <StatCard
          label="Security leads"
          value={stats.leads}
          tone="info"
          href="/leads"
          icon={<Activity className="size-4" />}
          hint={`${stats.newLeads} new`}
        />
      </section>

      {stats.demoRecords > 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-amber-500/25 bg-amber-500/[0.04] px-3.5 py-2.5">
          <DemoBadge mode="DEMO" />
          <p className="text-[11.5px] leading-snug text-fg-muted">
            This database contains {stats.demoRecords} fictional sample records. Every demo row is tagged{" "}
            <span className="font-mono text-fg-subtle">DEMO</span> and is never mixed into a real assessment.
          </p>
        </div>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="size-4 text-fg-subtle" strokeWidth={2} />
          <h2 className="text-[13px] font-semibold tracking-tight text-fg">Needs attention</h2>
          <span className="text-[11.5px] text-fg-subtle">plain reasons, no opaque score</span>
        </div>
        {attention.length === 0 ? (
          <Card>
            <EmptyState
              title="Nothing outstanding in the current scope"
              hint="No exploited advisories, no high findings and no expiring authorizations. Add scope or run a passive check to refresh the evidence."
              action={
                <ButtonLink href="/assets" variant="default">
                  Open assets
                </ButtonLink>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {attention.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`card card-hover group flex flex-col gap-2 border p-4 ${TONE_STYLES[item.tone]}`}
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className={`mt-0.5 size-4 shrink-0 ${TONE_ICON[item.tone]}`} strokeWidth={2} />
                  <p className="text-[12.5px] leading-snug font-medium text-fg">{item.headline}</p>
                </div>
                <p className="text-[11.5px] leading-relaxed text-fg-muted">{item.detail}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11.5px] font-medium text-accent">
                  {item.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Priority queue"
            description="Open findings ordered by the transparent rule-based engine."
            icon={<ShieldAlert className="size-4" />}
            action={
              <ButtonLink href="/findings" variant="ghost" size="sm">
                All findings
              </ButtonLink>
            }
          />
          {priorityQueue.length === 0 ? (
            <EmptyState title="No open findings" hint="Every recorded observation is either fixed, closed or accepted as risk." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Priority</Th>
                  <Th>Finding</Th>
                  <Th>Asset</Th>
                  <Th align="right">Open</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {priorityQueue.map((f) => (
                  <Tr key={f.id}>
                    <Td>
                      <Badge className={TIER_STYLES[f.priority.tier as PriorityTier]} title={f.priority.primaryReason}>
                        {f.priority.tier}
                      </Badge>
                    </Td>
                    <Td className="max-w-[280px]">
                      <div className="flex items-center gap-1.5">
                        <Badge className={SEVERITY_STYLES[f.severity as Severity]}>{f.severity}</Badge>
                        <span className="truncate font-medium text-fg" title={f.title}>
                          {f.title}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-fg-subtle" title={f.priority.reasons[0]}>
                        {f.priority.reasons[0]}
                      </p>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <Badge className={ASSET_TYPE_STYLES[f.asset.type as AssetType]}>
                          {f.asset.type.replace("_", " ").toLowerCase()}
                        </Badge>
                        <span className="truncate text-fg-muted">{f.asset.name}</span>
                      </span>
                    </Td>
                    <Td align="right" className="font-mono text-[11.5px] whitespace-nowrap text-fg-subtle">
                      {timeAgo(f.detectedAt)}
                    </Td>
                    <Td align="right">
                      <Link href={`/findings/${f.id}`} className="text-[11.5px] font-medium text-accent hover:underline">
                        Open
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader
              title="Expiring authorizations"
              description="After the end date no checks are permitted."
              icon={<Clock className="size-4" />}
            />
            {expiring.length === 0 ? (
              <EmptyState title="No active authorizations" hint="Any check on a non-authorized asset runs in passive mode only." />
            ) : (
              <ul className="divide-y divide-line">
                {expiring.slice(0, 5).map((a) => {
                  const soon = a.daysLeft <= 14;
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-fg">{a.asset.name}</p>
                        <p className="truncate text-[11px] text-fg-subtle">
                          {a.authorizedBy} · ends {formatDate(a.endDate)}
                        </p>
                      </div>
                      <Badge
                        className={
                          soon
                            ? "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30"
                            : "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30"
                        }
                      >
                        {relativeDays(a.endDate)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recently verified fixed"
              description="A re-test no longer reproduces the observation."
              icon={<CheckCircle2 className="size-4" />}
            />
            {recentlyFixed.length === 0 ? (
              <EmptyState title="Nothing verified fixed yet" hint="Re-test a finding after remediation to record the evidence." />
            ) : (
              <ul className="divide-y divide-line">
                {recentlyFixed.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Dot className="bg-emerald-400" />
                      <div className="min-w-0">
                        <Link href={`/findings/${f.id}`} className="block truncate text-[12.5px] font-medium text-fg hover:underline">
                          {f.title}
                        </Link>
                        <p className="truncate text-[11px] text-fg-subtle">{f.asset.name}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{f.ago}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader
            title="Activity log"
            description="Every check, status change and remediation is recorded here."
            icon={<Activity className="size-4" />}
          />
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" hint="Run a passive check on an asset to create the first evidence record." />
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Dot className="bg-accent/70" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-fg-muted">{a.summary}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10.5px] text-fg-subtle">{a.action}</span>
                  <span className="w-16 shrink-0 text-right font-mono text-[11px] text-fg-subtle">{a.ago}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}

function LockDot() {
  return <ShieldCheck className="size-3" strokeWidth={2.2} />;
}
