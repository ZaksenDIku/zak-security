import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ShieldAlert, FileCheck2, History, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, StatCard, EmptyState } from "@/components/Card";
import { Badge, DemoBadge } from "@/components/Badge";
import { Table, Th, Td, Tr } from "@/components/Table";
import { RunCheckButton } from "@/components/CheckButtons";
import { deriveAuthStatus } from "@/lib/queries";
import { CHECK_TYPE_LABELS, type CheckType } from "@/lib/constants";
import { formatDate, formatDateTime, relativeDays } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      authorizations: { orderBy: { endDate: "desc" } },
      findings: { orderBy: [{ severity: "desc" }, { detectedAt: "desc" }] },
      checks: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });

  if (!asset) notFound();

  const auth = asset.authorizations[0] ?? null;
  const status = deriveAuthStatus(auth);
  const authorized = status === "ACTIVE";
  const open = asset.findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS");

  return (
    <>
      <PageHeader
        title={asset.name}
        description={
          <>
            {asset.type.replace("_", " ").toLowerCase()} owned by {asset.owner}.{" "}
            {asset.url ? (
              <a href={asset.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                {asset.url}
              </a>
            ) : null}
          </>
        }
        meta={
          <>
            <DemoBadge mode={asset.dataMode} />
            <Badge className={authorized ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-slate-500/12 text-slate-400 ring-1 ring-slate-500/30"}>
              <Lock className="size-3" strokeWidth={2} />
              {status.replace("_", " ").toLowerCase()}
            </Badge>
            {asset.importance ? (
              <span className="text-[11.5px] text-fg-subtle">{asset.importance.toLowerCase()} importance</span>
            ) : null}
          </>
        }
        action={<RunCheckButton assetId={asset.id} authorized={authorized} />}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open findings" value={open.length} tone={open.length > 0 ? "warn" : "good"} />
        <StatCard label="Total findings" value={asset.findings.length} />
        <StatCard label="Checks run" value={asset.checks.length} />
        <StatCard label="Last checked" value={asset.lastChecked ? relativeDays(asset.lastChecked) : "never"} tone={asset.lastChecked ? "neutral" : "warn"} />
      </section>

      <section className="mt-5 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Findings" description="Only observations backed by recorded evidence." icon={<ShieldAlert className="size-4" />} />
          {asset.findings.length === 0 ? (
            <EmptyState title="No findings recorded" hint="Run a passive check to observe the public surface." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Severity</Th>
                  <Th>Status</Th>
                  <Th align="right">Detected</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {asset.findings.map((f) => (
                  <Tr key={f.id}>
                    <Td className="max-w-[320px]">
                      <span className="font-medium text-fg">{f.title}</span>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-subtle">{f.evidence}</p>
                    </Td>
                    <Td>{f.severity}</Td>
                    <Td>{f.status.replace("_", " ").toLowerCase()}</Td>
                    <Td align="right" className="text-[11.5px] text-fg-subtle">{formatDate(f.detectedAt)}</Td>
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
            <CardHeader title="Declared facts" icon={<Boxes className="size-4" />} />
            <dl className="divide-y divide-line text-[12.5px]">
              <Row label="Technologies" value={asset.technologies || "—"} />
              <Row label="Version" value={asset.version || "—"} />
              <Row label="AI tools" value={asset.aiTools || "—"} />
              <Row label="AI permissions" value={asset.aiPermissions || "—"} />
              <Row label="Human approval" value={asset.aiHumanApprovalRequired ? "required" : "not required"} />
              <Row label="MCP auth" value={asset.mcpAuthenticationEnabled ? "enabled" : "disabled"} />
              <Row label="MCP write access" value={asset.mcpWriteAccess ? "yes" : "no"} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Authorizations" icon={<FileCheck2 className="size-4" />} />
            {asset.authorizations.length === 0 ? (
              <EmptyState title="No authorization on file" hint="Only public passive inspection is permitted until one is recorded." />
            ) : (
              <ul className="divide-y divide-line">
                {asset.authorizations.map((a) => (
                  <li key={a.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-fg">{a.authorizedBy}</span>
                      <Badge className="bg-panel-2 text-fg-subtle ring-1 ring-line">{relativeDays(a.endDate)}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-fg-muted">{a.scope}</p>
                    <p className="mt-1 text-[11px] text-fg-subtle">
                      {formatDate(a.startDate)} → {formatDate(a.endDate)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {a.allowedChecks
                        .split(",")
                        .filter(Boolean)
                        .map((c) => (
                          <Badge key={c} className="bg-panel-2 text-fg-subtle ring-1 ring-line">
                            {CHECK_TYPE_LABELS[c as CheckType] ?? c}
                          </Badge>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      <section className="mt-5">
        <Card>
          <CardHeader title="Check history" description="Each run records exactly what was observed and whether it was authorized." icon={<History className="size-4" />} />
          {asset.checks.length === 0 ? (
            <EmptyState title="No checks run yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Check</Th>
                  <Th>Mode</Th>
                  <Th>Authorized</Th>
                  <Th>Result</Th>
                  <Th align="right">Findings</Th>
                  <Th align="right">Started</Th>
                </tr>
              </thead>
              <tbody>
                {asset.checks.map((c) => (
                  <Tr key={c.id}>
                    <Td className="text-fg">{CHECK_TYPE_LABELS[c.checkType as CheckType] ?? c.checkType}</Td>
                    <Td>{c.mode}</Td>
                    <Td>{c.authorized ? "yes" : "passive only"}</Td>
                    <Td>{c.result}</Td>
                    <Td align="right" className="font-mono text-fg">{c.findingsCount}</Td>
                    <Td align="right" className="text-[11.5px] text-fg-subtle">{formatDateTime(c.startedAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-fg" title={value}>{value}</dd>
    </div>
  );
}
