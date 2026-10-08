import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/Card";
import { Badge, DemoBadge } from "@/components/Badge";
import { Table, Th, Td, Tr } from "@/components/Table";
import { Button } from "@/components/Button";
import { Field, Input, Select, FormSection } from "@/components/Forms";
import { RunCheckButton } from "@/components/CheckButtons";
import { deriveAuthStatus } from "@/lib/queries";
import { createAssetAction } from "@/app/actions";
import {
  AUTH_STATUS_STYLES,
  ASSET_TYPE_STYLES,
  IMPORTANCE_STYLES,
  type AssetType,
  type AssetImportance,
  type AuthorizationStatus,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({
    include: {
      authorizations: { orderBy: { endDate: "desc" }, take: 1 },
      findings: { select: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Assets"
        description="Everything under watch: websites, domains, repositories, AI agents and MCP servers. Active checks require a recorded authorization; without one, only public passive inspection runs."
        meta={
          <span className="text-[11.5px] text-fg-subtle">
            {assets.length} asset{assets.length === 1 ? "" : "s"}
          </span>
        }
      />

      <Card className="mb-5">
        <CardHeader title="Add an asset" description="Declared facts only. Nothing is scanned until you run a check." icon={<Plus className="size-4" />} />
        <form action={createAssetAction}>
          <FormSection title="Identity" columns={2}>
            <Field label="Name" required>
              <Input name="name" required placeholder="example.dk" />
            </Field>
            <Field label="Owner" required hint="Who is responsible for this asset.">
              <Input name="owner" required placeholder="DemoFix ApS" />
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue="WEBSITE">
                <option value="WEBSITE">Website</option>
                <option value="DOMAIN">Domain</option>
                <option value="GITHUB_REPO">GitHub repository</option>
                <option value="AI_AGENT">AI agent</option>
                <option value="MCP_SERVER">MCP server</option>
              </Select>
            </Field>
            <Field label="URL">
              <Input name="url" placeholder="https://example.dk" />
            </Field>
            <Field label="Importance">
              <Select name="importance" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </Field>
            <Field label="Data mode" hint="Mark demo rows as DEMO so they are never mixed into a real assessment.">
              <Select name="dataMode" defaultValue="REAL">
                <option value="REAL">Real</option>
                <option value="DEMO">Demo</option>
              </Select>
            </Field>
            <Field label="Technologies" hint="Comma separated, e.g. nextjs,react,nginx.">
              <Input name="technologies" placeholder="nextjs,nginx" />
            </Field>
            <Field label="Version" hint="Used for conservative advisory matching.">
              <Input name="version" placeholder="14.2.3" />
            </Field>
          </FormSection>

          <FormSection title="AI agent / MCP configuration" description="Only used to review configuration you declare. Zak Security never connects to an agent or MCP server." columns={2}>
            <Field label="AI tools" hint="Comma separated: read_file, send_email, exec_shell …">
              <Input name="aiTools" />
            </Field>
            <Field label="AI permissions">
              <Input name="aiPermissions" />
            </Field>
            <Field label="External integrations">
              <Input name="aiExternalIntegrations" />
            </Field>
            <Field label="MCP server URL">
              <Input name="mcpServerUrl" />
            </Field>
            <Field label="MCP tools exposed">
              <Input name="mcpToolsExposed" />
            </Field>
          </FormSection>

          <FormSection title="Notes" columns={1}>
            <Field label="Scope notes">
              <Input name="notes" placeholder="Public marketing site only. No login testing in scope." />
            </Field>
          </FormSection>

          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <Button type="submit" variant="primary">
              <Plus className="size-3.5" strokeWidth={2} />
              Add asset
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Asset inventory" icon={<Boxes className="size-4" />} />
        <Table>
          <thead>
            <tr>
              <Th>Asset</Th>
              <Th>Type</Th>
              <Th>Importance</Th>
              <Th>Authorization</Th>
              <Th align="right">Open</Th>
              <Th align="right">Last checked</Th>
              <Th align="right">Check</Th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const auth = a.authorizations[0] ?? null;
              const status = deriveAuthStatus(auth) as AuthorizationStatus;
              const authorized = status === "ACTIVE";
              const open = a.findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS").length;
              return (
                <Tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link href={`/assets/${a.id}`} className="font-medium text-fg hover:underline">
                        {a.name}
                      </Link>
                      <DemoBadge mode={a.dataMode} />
                    </div>
                    {a.version ? <span className="font-mono text-[11px] text-fg-subtle">v{a.version}</span> : null}
                  </Td>
                  <Td>
                    <Badge className={ASSET_TYPE_STYLES[a.type as AssetType]}>{a.type.replace("_", " ").toLowerCase()}</Badge>
                  </Td>
                  <Td>
                    <Badge className={IMPORTANCE_STYLES[a.importance as AssetImportance]}>{a.importance.toLowerCase()}</Badge>
                  </Td>
                  <Td>
                    <Badge className={AUTH_STATUS_STYLES[status]}>
                      {status.replace("_", " ").toLowerCase()}
                      {auth ? ` · ${formatDate(auth.endDate)}` : ""}
                    </Badge>
                  </Td>
                  <Td align="right" className="font-mono text-fg">{open}</Td>
                  <Td align="right" className="text-[11.5px] text-fg-subtle">
                    {a.lastChecked ? formatDate(a.lastChecked) : "never"}
                  </Td>
                  <Td align="right">
                    <RunCheckButton assetId={a.id} authorized={authorized} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
