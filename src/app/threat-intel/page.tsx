import { Radar, ExternalLink, AlertTriangle } from "lucide-react";
import { getThreatIntel } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/Card";
import { Badge, DemoBadge } from "@/components/Badge";
import { SEVERITY_STYLES, type Severity } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const VERDICT_STYLES: Record<string, string> = {
  POTENTIAL_MATCH: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30",
  TECHNOLOGY_ONLY: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30",
};

const VERDICT_LABEL: Record<string, string> = {
  POTENTIAL_MATCH: "Potential match",
  TECHNOLOGY_ONLY: "Technology only",
};

export default async function ThreatIntelPage() {
  const intel = await getThreatIntel();
  const kev = intel.filter((i) => i.advisory.knownExploited).length;

  return (
    <>
      <PageHeader
        title="Threat intel"
        description="Advisories are matched against declared asset technologies and versions. A match is only reported as POTENTIAL when the declared version falls inside the declared affected range — never as a confirmed vulnerable install."
        meta={
          <span className="text-[11.5px] text-fg-subtle">
            {intel.length} advisories · {kev} known exploited
          </span>
        }
      />

      {intel.length === 0 ? (
        <Card>
          <EmptyState title="No advisories in the feed" />
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {intel.map(({ advisory, assets }) => (
            <Card key={advisory.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{advisory.advisoryId}</span>
                    {advisory.knownExploited ? (
                      <Badge className="bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30">
                        <AlertTriangle className="size-3" strokeWidth={2.2} />
                        Known exploited
                      </Badge>
                    ) : null}
                    <DemoBadge mode={advisory.dataMode} />
                  </span>
                }
                description={advisory.title}
                icon={<Radar className="size-4" />}
              />
              <div className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={SEVERITY_STYLES[advisory.severity as Severity]}>{advisory.severity}</Badge>
                  <span className="text-[11.5px] text-fg-subtle">
                    {advisory.affectedTechnology} · affected {advisory.affectedVersions || "unknown"}
                  </span>
                  {advisory.fixedVersion ? (
                    <span className="text-[11.5px] text-emerald-300">fixed in {advisory.fixedVersion}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">{advisory.description}</p>

                <div className="mt-3 border-t border-line pt-3">
                  <p className="mb-2 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">Asset matches</p>
                  {assets.length === 0 ? (
                    <p className="text-[12px] text-fg-subtle">No asset declares a matching technology.</p>
                  ) : (
                    <ul className="space-y-2">
                      {assets.map((a) => (
                        <li key={a.id} className="rounded-lg bg-panel-2/60 px-3 py-2 ring-1 ring-line">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12.5px] font-medium text-fg">{a.name}</span>
                            <Badge className={VERDICT_STYLES[a.verdict]}>{VERDICT_LABEL[a.verdict] ?? a.verdict}</Badge>
                          </div>
                          <p className="mt-1 text-[11.5px] leading-snug text-fg-subtle">{a.explanation}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                  <span className="text-[11px] text-fg-subtle">Published {formatDate(advisory.publishedAt)}</span>
                  {advisory.referenceUrl ? (
                    <a href={advisory.referenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
                      Reference
                      <ExternalLink className="size-3" strokeWidth={2} />
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
