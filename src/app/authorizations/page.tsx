import { FileCheck2, Plus, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Table, Th, Td, Tr } from "@/components/Table";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea, FormSection, Checkbox } from "@/components/Forms";
import { createAuthorizationAction } from "@/app/actions";
import { deriveAuthStatus } from "@/lib/queries";
import { AUTH_STATUS_STYLES, CHECK_TYPE_LABELS, type CheckType, type AuthorizationStatus } from "@/lib/constants";
import { formatDate, relativeDays } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHECK_TYPES: CheckType[] = ["PASSIVE_WEB", "SAFE_HTTP", "DEPENDENCY_CHECK", "GITHUB_SECURITY", "AI_AGENT_REVIEW", "MCP_REVIEW"];

export default async function AuthorizationsPage() {
  const [authorizations, assets] = await Promise.all([
    prisma.authorization.findMany({ include: { asset: true }, orderBy: { endDate: "desc" } }),
    prisma.asset.findMany({ orderBy: { name: "asc" } }),
  ]);

  const active = authorizations.filter((a) => deriveAuthStatus(a) === "ACTIVE");

  return (
    <>
      <PageHeader
        title="Authorizations"
        description="Written permission is the gate for every active check. Passive public inspection runs regardless; anything beyond that needs an authorization inside its date range."
        meta={
          <span className="text-[11.5px] text-fg-subtle">
            {active.length} active · {authorizations.length} total
          </span>
        }
      />

      <Card className="mb-5">
        <CardHeader title="Record an authorization" description="Scope must be concrete. The end date is the hard stop." icon={<Plus className="size-4" />} />
        <form action={createAuthorizationAction}>
          <FormSection title="Scope" columns={2}>
            <Field label="Asset" required>
              <Select name="assetId" required defaultValue="">
                <option value="" disabled>
                  Select an asset…
                </option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Authorized by" required hint="Name and role of the person granting permission.">
              <Input name="authorizedBy" required placeholder="Head of IT, DemoFix ApS" />
            </Field>
            <Field label="Start date" required>
              <Input name="startDate" type="date" required />
            </Field>
            <Field label="End date" required>
              <Input name="endDate" type="date" required />
            </Field>
            <Field label="Scope" required className="sm:col-span-2">
              <Textarea name="scope" required rows={2} placeholder="Public marketing site and HTTP response headers only. No authentication testing, no denial of service." />
            </Field>
          </FormSection>

          <FormSection title="Allowed checks" description="Nothing outside this list may run while authorized." columns={3}>
            {CHECK_TYPES.map((c) => (
              <Checkbox key={c} name="allowedChecks" value={c} label={CHECK_TYPE_LABELS[c]} defaultChecked={c === "PASSIVE_WEB" || c === "SAFE_HTTP"} />
            ))}
          </FormSection>

          <FormSection title="Notes" columns={1}>
            <Field label="Notes">
              <Input name="notes" />
            </Field>
          </FormSection>

          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <Button type="submit" variant="primary">
              <Lock className="size-3.5" strokeWidth={2} />
              Record authorization
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Recorded authorizations" icon={<FileCheck2 className="size-4" />} />
        {authorizations.length === 0 ? (
          <EmptyState title="No authorizations on file" hint="Every asset is limited to public passive inspection." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Asset</Th>
                <Th>Authorized by</Th>
                <Th>Scope</Th>
                <Th>Allowed checks</Th>
                <Th>Valid</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {authorizations.map((a) => {
                const status = deriveAuthStatus(a) as AuthorizationStatus;
                return (
                  <Tr key={a.id}>
                    <Td className="font-medium text-fg">{a.asset.name}</Td>
                    <Td>{a.authorizedBy}</Td>
                    <Td className="max-w-[280px] truncate" ><span title={a.scope}>{a.scope}</span></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {a.allowedChecks
                          .split(",")
                          .filter(Boolean)
                          .map((c) => (
                            <Badge key={c} className="bg-panel-2 text-fg-subtle ring-1 ring-line">
                              {CHECK_TYPE_LABELS[c as CheckType] ?? c}
                            </Badge>
                          ))}
                      </div>
                    </Td>
                    <Td className="text-[11.5px] whitespace-nowrap text-fg-subtle">
                      {formatDate(a.startDate)} → {formatDate(a.endDate)}
                      <span className="block">{relativeDays(a.endDate)}</span>
                    </Td>
                    <Td>
                      <Badge className={AUTH_STATUS_STYLES[status]}>{status.replace("_", " ").toLowerCase()}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
