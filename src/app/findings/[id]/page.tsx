import Link from "next/link";
import { notFound } from "next/navigation";
import { WandSparkles, CheckCircle2, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getRemediationForFinding, generateRemediationAction } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/Card";
import { Badge, DemoBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FindingStatusControl } from "@/components/StatusControls";
import { ReverifyButton } from "@/components/CheckButtons";
import { computePriority, TIER_STYLES, type PriorityTier } from "@/lib/priority";
import { deriveAuthStatus } from "@/lib/queries";
import { SEVERITY_STYLES, type Severity } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const finding = await prisma.finding.findUnique({
    where: { id },
    include: { asset: { include: { authorizations: { orderBy: { endDate: "desc" }, take: 1 } } } },
  });
  if (!finding) notFound();
  const findingId = finding.id;

  const remediation = await getRemediationForFinding(id);
  const advisories = await prisma.threatAdvisory.findMany({ where: { knownExploited: true } });
  const auth = finding.asset.authorizations[0] ?? null;
  const authStatus = deriveAuthStatus(auth);
  const authorized = authStatus === "ACTIVE";

  const priority = computePriority({
    severity: finding.severity as Severity,
    status: finding.status,
    importance: finding.asset.importance,
    detectedAt: finding.detectedAt,
    authorizationActive: authorized,
    authorizationEndDate: auth?.endDate ?? null,
    assetType: finding.asset.type,
    knownExploited: advisories.some((a) => finding.fingerprint.includes(a.advisoryId)),
  });

  async function generate() {
    "use server";
    await generateRemediationAction(findingId);
  }

  return (
    <>
      <PageHeader
        title={finding.title}
        description={
          <>
            On{" "}
            <Link href={`/assets/${finding.asset.id}`} className="text-accent hover:underline">
              {finding.asset.name}
            </Link>{" "}
            · category <span className="font-mono">{finding.category}</span>
          </>
        }
        meta={
          <>
            <Badge className={TIER_STYLES[priority.tier as PriorityTier]}>{priority.tier} priority</Badge>
            <Badge className={SEVERITY_STYLES[finding.severity as Severity]}>{finding.severity}</Badge>
            <DemoBadge mode={finding.dataMode} />
          </>
        }
        action={
          <>
            <ReverifyButton findingId={finding.id} disabled={!authorized} />
            <form action={generate}>
              <Button type="submit" variant="primary" size="sm">
                <WandSparkles className="size-3.5" strokeWidth={2} />
                Generate remediation
              </Button>
            </form>
          </>
        }
      />

      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Evidence" description="A finding is never raised without non-empty evidence." icon={<FileText className="size-4" />} />
          <div className="px-4 py-3.5">
            <pre className="overflow-x-auto rounded-lg bg-panel-2 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-fg-muted ring-1 ring-line">
              {finding.evidence}
            </pre>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <Info label="Source" value={finding.source} />
              <Info label="Source type" value={finding.sourceType.replace("_", " ").toLowerCase()} />
              <Info label="Fingerprint" value={finding.fingerprint || "—"} mono />
              <Info label="Detected" value={formatDateTime(finding.detectedAt)} />
            </dl>
            {finding.verifiedAt ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-emerald-300">
                <CheckCircle2 className="size-3.5" strokeWidth={2} />
                Re-test passed {formatDateTime(finding.verifiedAt)}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader title="Why this priority" description="Plain reasons, no opaque score." />
            <ol className="divide-y divide-line">
              {priority.reasons.map((r, i) => (
                <li key={i} className="flex gap-2.5 px-4 py-2.5 text-[12px] leading-relaxed text-fg-muted">
                  <span className="mt-0.5 font-mono text-[10.5px] text-fg-subtle">{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Status" description="Changes are recorded in the activity log." />
            <div className="px-4 py-3.5">
              <FindingStatusControl findingId={finding.id} current={finding.status} />
              <p className="mt-3 text-[11.5px] leading-snug text-fg-subtle">
                {authorized
                  ? "The asset has an active authorization, so remediation and re-testing can proceed."
                  : "No active authorization. Re-test is disabled; fix work must be done by the asset owner."}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {remediation ? (
        <section className="mt-5">
          <Card>
            <CardHeader
              title={`Remediation — ${remediation.title}`}
              description={`Source: ${remediation.source === "AI_ASSISTED" ? "OpenAI-assisted wording" : "built-in templates"}. Code snippets always come from the templates.`}
              icon={<WandSparkles className="size-4" />}
            />
            <div className="grid gap-4 px-4 py-3.5 lg:grid-cols-2">
              <div>
                <h4 className="text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">Why it matters</h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{remediation.whyItMatters}</p>
                <h4 className="mt-4 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">Verification</h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{remediation.verification}</p>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">Recommended fix</h4>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{remediation.fix}</p>
                <div className="mt-3 space-y-2">
                  {remediation.examples.map((ex, i) => (
                    <div key={i}>
                      <span className="text-[11px] font-medium text-fg-subtle">{ex.stack}</span>
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-panel-2 px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted ring-1 ring-line">
                        {ex.snippet}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}
    </>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd className={`truncate text-fg ${mono ? "font-mono text-[11px]" : ""}`} title={value}>{value}</dd>
    </div>
  );
}
