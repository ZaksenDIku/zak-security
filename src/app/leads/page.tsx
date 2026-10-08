import { Users, Plus, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/Card";
import { DemoBadge } from "@/components/Badge";
import { Table, Th, Td, Tr } from "@/components/Table";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea, FormSection } from "@/components/Forms";
import { LeadStatusSelect } from "@/components/StatusControls";
import { createLeadAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await prisma.securityLead.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });

  return (
    <>
      <PageHeader
        title="Security leads"
        description="Outreach opportunities phrased as opportunities, never as “this company is vulnerable”. Every lead needs a source URL so the observation stays traceable."
        meta={<span className="text-[11.5px] text-fg-subtle">{leads.length} leads</span>}
      />

      <Card className="mb-5">
        <CardHeader title="Add a lead" description="A source URL is required." icon={<Plus className="size-4" />} />
        <form action={createLeadAction}>
          <FormSection title="Company" columns={2}>
            <Field label="Company" required>
              <Input name="company" required />
            </Field>
            <Field label="Website" required>
              <Input name="website" required placeholder="https://example.dk" />
            </Field>
            <Field label="Industry">
              <Input name="industry" />
            </Field>
            <Field label="Location">
              <Input name="location" />
            </Field>
          </FormSection>
          <FormSection title="Observation" columns={1}>
            <Field label="Observed issue" hint="A neutral, factual observation — not an accusation.">
              <Textarea name="observedIssue" rows={2} />
            </Field>
            <Field label="Service opportunity">
              <Textarea name="serviceOpportunity" rows={2} />
            </Field>
            <Field label="Source URL" required hint="Where the observation can be verified.">
              <Input name="sourceUrl" required placeholder="https://…" />
            </Field>
          </FormSection>
          <FormSection title="Data mode" columns={1}>
            <Field label="Mode" hint="Demo leads are fictional and tagged in the UI.">
              <Select name="dataMode" defaultValue="DEMO">
                <option value="DEMO">Demo</option>
                <option value="REAL">Real</option>
              </Select>
            </Field>
          </FormSection>
          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <Button type="submit" variant="primary">
              <Plus className="size-3.5" strokeWidth={2} />
              Add lead
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Pipeline" icon={<Users className="size-4" />} />
        {leads.length === 0 ? (
          <EmptyState title="No leads yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Industry / location</Th>
                <Th>Observed issue</Th>
                <Th>Source</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{l.company}</span>
                      <DemoBadge mode={l.dataMode} />
                    </div>
                    <a href={l.website} target="_blank" rel="noreferrer" className="text-[11px] text-accent hover:underline">
                      {l.website}
                    </a>
                  </Td>
                  <Td className="text-[11.5px] text-fg-subtle">
                    {l.industry}
                    <span className="block">{l.location}</span>
                  </Td>
                  <Td className="max-w-[280px]">
                    <p className="truncate text-fg-muted" title={l.observedIssue}>{l.observedIssue || "—"}</p>
                    {l.serviceOpportunity ? (
                      <p className="mt-0.5 truncate text-[11px] text-fg-subtle" title={l.serviceOpportunity}>
                        → {l.serviceOpportunity}
                      </p>
                    ) : null}
                  </Td>
                  <Td>
                    <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-accent hover:underline">
                      Source
                      <ExternalLink className="size-3" strokeWidth={2} />
                    </a>
                  </Td>
                  <Td className="w-[150px]">
                    <LeadStatusSelect leadId={l.id} current={l.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
