"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { runCheckForAsset, logActivity, evaluateAuthorization } from "@/lib/checks/runner";
import { buildRemediation } from "@/lib/remediation/provider";
import { getTemplateForCategory, fallbackTemplate } from "@/lib/remediation/templates";
import type { AssetType, CheckType, LeadStatus, FindingStatus } from "@prisma/client";

function flash(message: string, kind: "ok" | "error" = "ok"): never {
  redirect(`/settings?flash=${encodeURIComponent(message)}&kind=${kind}`);
}

export async function runSafeCheckAction(assetId: string) {
  const result = await runCheckForAsset(assetId);
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/findings");
  revalidatePath("/briefing");
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { name: true } });
  const message = result.ok
    ? `${asset?.name ?? "Asset"}: ${result.created.length} new, ${result.updated.length} updated, ${result.resolved.length} resolved.`
    : result.error ?? "Check failed.";
  flash(message, result.ok ? "ok" : "error");
}

export async function setFindingStatusAction(findingId: string, status: FindingStatus) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) flash("Finding not found.", "error");

  const now = new Date();
  await prisma.finding.update({
    where: { id: findingId },
    data: {
      status,
      verifiedAt: status === "FIXED" ? now : null,
      updatedAt: now,
    },
  });

  const action =
    status === "FIXED"
      ? "finding.fixed"
      : status === "ACCEPTED_RISK"
        ? "finding.accepted"
        : status === "IN_PROGRESS"
          ? "finding.in_progress"
          : "finding.reopened";

  await logActivity({
    action,
    entity: "Finding",
    entityId: findingId,
    assetId: finding.assetId,
    summary: `"${finding.title}" moved to ${status.replace("_", " ").toLowerCase()}.`,
    details: status === "ACCEPTED_RISK" ? "Accepted risk recorded without remediation." : "",
    dataMode: finding.dataMode,
  });

  revalidatePath("/");
  revalidatePath("/findings");
  revalidatePath(`/findings/${findingId}`);
  revalidatePath("/briefing");
}

export async function reverifyFindingAction(findingId: string) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) flash("Finding not found.", "error");

  const decision = await evaluateAuthorization(finding.assetId);
  if (!decision.active) {
    flash(
      "Re-test needs an active authorization. Only public passive inspection is permitted on this asset right now.",
      "error"
    );
  }

  const result = await runCheckForAsset(finding.assetId);
  const after = await prisma.finding.findUnique({ where: { id: findingId } });

  revalidatePath("/");
  revalidatePath("/findings");
  revalidatePath(`/findings/${findingId}`);
  revalidatePath("/briefing");

  if (!result.ok) {
    flash(result.error ?? "Re-test failed.", "error");
  }
  flash(
    after?.status === "FIXED"
      ? `Re-test passed. "${finding.title}" is now marked fixed.`
      : `Re-test completed. "${finding.title}" is still reproducible and remains ${after?.status}.`,
    after?.status === "FIXED" ? "ok" : "error"
  );
}

export async function generateRemediationAction(findingId: string) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) flash("Finding not found.", "error");

  const output = await buildRemediation(finding.category, finding.title, finding.evidence);

  await prisma.remediation.upsert({
    where: { id: findingId },
    update: {
      title: output.template.title,
      category: output.template.category,
      whyItMatters: output.whyItMatters,
      fix: output.recommendedFix,
      examples: JSON.stringify(output.template.examples),
      verification: output.template.verification,
      generatedBy: output.source,
      dataMode: finding.dataMode,
    },
    create: {
      id: findingId,
      title: output.template.title,
      category: output.template.category,
      whyItMatters: output.whyItMatters,
      fix: output.recommendedFix,
      examples: JSON.stringify(output.template.examples),
      verification: output.template.verification,
      generatedBy: output.source,
      dataMode: finding.dataMode,
    },
  });

  await logActivity({
    action: "remediation.generated",
    entity: "Remediation",
    entityId: findingId,
    assetId: finding.assetId,
    summary: `Remediation generated for "${finding.title}" using ${output.source === "AI_ASSISTED" ? "OpenAI" : "built-in templates"}.`,
    dataMode: finding.dataMode,
  });

  revalidatePath("/remediation");
  revalidatePath(`/findings/${findingId}`);
  redirect(`/remediation?focus=${findingId}`);
}

export async function createAssetAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "WEBSITE") as AssetType;
  const url = String(formData.get("url") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const technologies = String(formData.get("technologies") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();
  const importance = String(formData.get("importance") ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  const dataMode = (String(formData.get("dataMode") ?? "REAL") as "REAL" | "DEMO") || "REAL";

  if (!name || !owner) {
    flash("Name and owner are required.", "error");
  }

  const isAgent = type === "AI_AGENT" || type === "MCP_SERVER";

  const asset = await prisma.asset.create({
    data: {
      name,
      type,
      url,
      owner,
      notes: notes || null,
      technologies,
      version: version || null,
      importance,
      dataMode,
      authorizationStatus: "NOT_AUTHORIZED",
      aiTools: String(formData.get("aiTools") ?? ""),
      aiPermissions: String(formData.get("aiPermissions") ?? ""),
      aiExternalIntegrations: String(formData.get("aiExternalIntegrations") ?? ""),
      aiHumanApprovalRequired: formData.get("aiHumanApprovalRequired") === "on",
      aiSensitiveDataAccess: formData.get("aiSensitiveDataAccess") === "on",
      mcpServerUrl: String(formData.get("mcpServerUrl") ?? "") || null,
      mcpAuthenticationEnabled: formData.get("mcpAuthenticationEnabled") === "on",
      mcpToolsExposed: String(formData.get("mcpToolsExposed") ?? ""),
      mcpWriteAccess: formData.get("mcpWriteAccess") === "on",
    },
  });

  await logActivity({
    action: "asset.created",
    entity: "Asset",
    entityId: asset.id,
    assetId: asset.id,
    summary: `Asset "${asset.name}" (${type}) added, owned by ${asset.owner}. Not authorized yet.`,
    dataMode: asset.dataMode,
  });

  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/authorizations");
  redirect(`/assets/${asset.id}`);
}

export async function createAuthorizationAction(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "");
  const authorizedBy = String(formData.get("authorizedBy") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();
  const startDate = new Date(String(formData.get("startDate") ?? ""));
  const endDate = new Date(String(formData.get("endDate") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim();
  const allowed = formData.getAll("allowedChecks").map(String) as CheckType[];

  if (!assetId || !authorizedBy || !scope) flash("Asset, authorized by and scope are required.", "error");
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    flash("Start and end date are required.", "error");
  }
  if (endDate <= startDate) flash("The end date must be after the start date.", "error");
  if (allowed.length === 0) flash("Select at least one allowed check type.", "error");

  const now = new Date();
  const status = startDate <= now && endDate >= now ? "ACTIVE" : startDate > now ? "NOT_AUTHORIZED" : "EXPIRED";

  const auth = await prisma.authorization.create({
    data: {
      assetId,
      authorizedBy,
      scope,
      startDate,
      endDate,
      allowedChecks: allowed.join(","),
      notes: notes || null,
      status,
      dataMode: "REAL",
    },
  });

  if (status === "ACTIVE") {
    await prisma.asset.update({ where: { id: assetId }, data: { authorizationStatus: "ACTIVE" } });
  }

  await logActivity({
    action: "authorization.created",
    entity: "Authorization",
    entityId: auth.id,
    assetId,
    summary: `Authorization recorded for asset, authorized by ${authorizedBy}, valid ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}. Scope: ${scope}.`,
    dataMode: "REAL",
  });

  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/authorizations");
  flash("Authorization recorded.");
}

export async function createLeadAction(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const observedIssue = String(formData.get("observedIssue") ?? "").trim();
  const serviceOpportunity = String(formData.get("serviceOpportunity") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const dataMode = String(formData.get("dataMode") ?? "DEMO") === "REAL" ? "REAL" : "DEMO";

  if (!company || !website) flash("Company and website are required.", "error");
  if (!sourceUrl) flash("A source URL is required. Observations must be traceable.", "error");

  const lead = await prisma.securityLead.create({
    data: {
      company,
      website,
      industry: industry || "Unknown",
      location: location || "Unknown",
      observedIssue,
      serviceOpportunity,
      sourceUrl,
      dataMode,
    },
  });

  await logActivity({
    action: "lead.created",
    entity: "SecurityLead",
    entityId: lead.id,
    summary: `Security lead "${company}" added (${dataMode.toLowerCase()} data).`,
    dataMode,
  });

  revalidatePath("/leads");
  revalidatePath("/");
  flash("Lead added.");
}

export async function setLeadStatusAction(leadId: string, status: LeadStatus) {
  const lead = await prisma.securityLead.update({ where: { id: leadId }, data: { status } });
  await logActivity({
    action: "lead.status_changed",
    entity: "SecurityLead",
    entityId: lead.id,
    summary: `Lead "${lead.company}" moved to ${status.toLowerCase()}.`,
    dataMode: lead.dataMode,
  });
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function getRemediationForFinding(findingId: string) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) return null;
  const stored = await prisma.remediation.findUnique({ where: { id: findingId } });
  if (stored) {
    return {
      finding,
      title: stored.title,
      whyItMatters: stored.whyItMatters,
      fix: stored.fix,
      examples: JSON.parse(stored.examples) as { stack: string; snippet: string }[],
      verification: stored.verification,
      source: stored.generatedBy,
    };
  }
  const template = getTemplateForCategory(finding.category) ?? fallbackTemplate(finding.title, finding.category);
  return {
    finding,
    title: template.title,
    whyItMatters: template.whyItMatters,
    fix: template.recommendedFix,
    examples: template.examples,
    verification: template.verification,
    source: "TEMPLATES",
  };
}
