import Link from "next/link";
import { WandSparkles, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getRemediationForFinding } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { SEVERITY_STYLES, type Severity } from "@/lib/constants";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function RemediationPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams;

  const findings = await prisma.finding.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
    include: { asset: { select: { name: true, id: true } } },
  });

  const items = await Promise.all(
    findings.map(async (f) => ({ finding: f, remediation: await getRemediationForFinding(f.id) }))
  );

  return (
    <>
      <PageHeader
        title="AI remediation"
        description="Fixes are built from in-repo templates and never invent a config value. Set OPENAI_API_KEY to let the model reword the prose only — the code snippets always come from the templates."
        meta={
          <span className="text-[11.5px] text-fg-subtle">
            {process.env.OPENAI_API_KEY ? "OpenAI-assisted wording enabled" : "Template-generated (no API key)"}
          </span>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState title="No open findings to remediate" hint="Closed and accepted findings are excluded from this queue." />
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map(({ finding, remediation }) => (
            <Card key={finding.id} className={cn(focus === finding.id && "ring-2 ring-accent/50")}>
              <CardHeader
                title={finding.title}
                description={
                  <span>
                    <Link href={`/assets/${finding.asset.id}`} className="text-accent hover:underline">
                      {finding.asset.name}
                    </Link>{" "}
                    · {finding.category}
                  </span>
                }
                icon={<WandSparkles className="size-4" />}
                action={
                  <Link href={`/findings/${finding.id}`} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
                    Finding
                    <ExternalLink className="size-3" strokeWidth={2} />
                  </Link>
                }
              />
              {remediation ? (
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Badge className={SEVERITY_STYLES[finding.severity as Severity]}>{finding.severity}</Badge>
                    <Badge className="bg-panel-2 text-fg-subtle ring-1 ring-line">
                      {remediation.source === "AI_ASSISTED" ? "AI-assisted wording" : "Built-in template"}
                    </Badge>
                  </div>
                  <h4 className="mt-3 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">Recommended fix</h4>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{remediation.fix}</p>
                  {remediation.examples[0] ? (
                    <pre className="mt-2.5 overflow-x-auto rounded-lg bg-panel-2 px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted ring-1 ring-line">
                      {remediation.examples[0].snippet}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
