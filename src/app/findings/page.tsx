import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getFindingsForList } from "@/lib/queries";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/Card";
import { Badge, DemoBadge } from "@/components/Badge";
import { Table, Th, Td, Tr } from "@/components/Table";
import { FindingStatusControl } from "@/components/StatusControls";
import { TIER_STYLES, type PriorityTier } from "@/lib/priority";
import { SEVERITY_STYLES, ASSET_TYPE_STYLES, type Severity, type AssetType } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const findings = await getFindingsForList();
  const open = findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS");

  return (
    <>
      <PageHeader
        title="Findings"
        description="Every raised finding carries non-empty evidence and a source. Priority comes from the transparent rule-based engine — hover a tier to read why."
        meta={
          <span className="text-[11.5px] text-fg-subtle">
            {open.length} open · {findings.length - open.length} closed
          </span>
        }
      />

      <Card>
        <CardHeader title="All findings" icon={<ShieldAlert className="size-4" />} />
        <Table>
          <thead>
            <tr>
              <Th>Priority</Th>
              <Th>Finding</Th>
              <Th>Asset</Th>
              <Th align="right">Age</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <Tr key={f.id}>
                <Td>
                  <Badge className={TIER_STYLES[f.priority.tier as PriorityTier]} title={f.priority.reasons.join(" ")}>
                    {f.priority.tier}
                  </Badge>
                </Td>
                <Td className="max-w-[320px]">
                  <div className="flex items-center gap-1.5">
                    <Badge className={SEVERITY_STYLES[f.severity as Severity]}>{f.severity}</Badge>
                    <Link href={`/findings/${f.id}`} className="truncate font-medium text-fg hover:underline" title={f.title}>
                      {f.title}
                    </Link>
                    <DemoBadge mode={f.dataMode} />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{f.priority.primaryReason}</p>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <Badge className={ASSET_TYPE_STYLES[f.asset.type as AssetType]}>
                      {f.asset.type.replace("_", " ").toLowerCase()}
                    </Badge>
                    <Link href={`/assets/${f.asset.id}`} className="truncate text-fg-muted hover:underline">
                      {f.asset.name}
                    </Link>
                  </div>
                </Td>
                <Td align="right" className="font-mono text-[11.5px] whitespace-nowrap text-fg-subtle">
                  {timeAgo(f.detectedAt)}
                </Td>
                <Td>
                  <FindingStatusControl findingId={f.id} current={f.status} />
                </Td>
                <Td align="right">
                  <Link href={`/findings/${f.id}`} className="text-[11.5px] font-medium text-accent hover:underline">
                    Details
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
