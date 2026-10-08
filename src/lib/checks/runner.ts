import "server-only";
import { prisma } from "@/lib/prisma";
import type { CheckType, DataMode } from "@prisma/client";
import { runPassiveWebCheck } from "@/lib/checks/passive-web";
import { deriveFindings, summarizeReport } from "@/lib/checks/derive";
import { reviewConfiguration } from "@/lib/checks/agent-review";
import { formatDate } from "@/lib/format";

/**
 * Central check runner. Every check in Zak Security goes through here so that
 * authorization is verified and the run is logged in exactly one place.
 *
 * Two modes:
 *  - PASSIVE  public information only (headers, page content, security.txt).
 *             Permitted for ANY asset. Performs no more than the documented
 *             bounded requests.
 *  - AUTHORIZED requires a live Authorization row covering the requested
 *             check type for this asset.
 */

export type CheckMode = "PASSIVE" | "AUTHORIZED";

export interface AuthorizationDecision {
  active: boolean;
  allowedChecks: CheckType[];
  authorizationId: string | null;
  authorizedBy: string | null;
  expiresAt: Date | null;
  reason: string;
}

export async function evaluateAuthorization(assetId: string): Promise<AuthorizationDecision> {
  const auth = await prisma.authorization.findFirst({
    where: {
      assetId,
      status: "ACTIVE",
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    orderBy: { endDate: "desc" },
  });

  if (!auth) {
    const anyAuth = await prisma.authorization.findFirst({
      where: { assetId },
      orderBy: { endDate: "desc" },
    });
    return {
      active: false,
      allowedChecks: [],
      authorizationId: null,
      authorizedBy: null,
      expiresAt: null,
      reason: anyAuth
        ? "The most recent authorization for this asset is expired or outside its date range. Only public passive inspection is permitted."
        : "No authorization on file. Only basic public passive inspection is permitted.",
    };
  }

  return {
    active: true,
    allowedChecks: auth.allowedChecks.split(",").map((s) => s.trim()).filter(Boolean) as CheckType[],
    authorizationId: auth.id,
    authorizedBy: auth.authorizedBy,
    expiresAt: auth.endDate,
    reason: `Authorization on file from ${auth.authorizedBy}, valid until ${formatDate(auth.endDate)}.`,
  };
}

export async function logActivity(entry: {
  action: string;
  entity: string;
  entityId?: string;
  assetId?: string;
  summary: string;
  details?: string;
  dataMode?: DataMode;
}) {
  return prisma.activityLog.create({
    data: {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      assetId: entry.assetId,
      summary: entry.summary,
      details: entry.details ?? "",
      dataMode: entry.dataMode ?? "REAL",
    },
  });
}

export interface RunResult {
  ok: boolean;
  error?: string;
  mode: CheckMode;
  summary: string;
  created: string[];
  updated: string[];
  resolved: string[];
  checkRunId?: string;
  report?: Awaited<ReturnType<typeof runPassiveWebCheck>>;
  configFindings?: number;
}

/**
 * Runs the correct check for an asset type and reconciles findings:
 *  - new observation      -> create finding
 *  - still failing        -> update detectedAt, keep the original detect date via createdAt
 *  - no longer observed   -> mark FIXED and stamp verifiedAt (a re-test, not a guess)
 */
export async function runCheckForAsset(assetId: string): Promise<RunResult> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { ok: false, error: "Asset not found.", mode: "PASSIVE", summary: "", created: [], updated: [], resolved: [] };

  const decision = await evaluateAuthorization(assetId);

  // --- Configuration review (AI agent / MCP). No network access at all. ---
  if (asset.type === "AI_AGENT" || asset.type === "MCP_SERVER") {
    const checkType: CheckType = asset.type === "AI_AGENT" ? "AI_AGENT_REVIEW" : "MCP_REVIEW";
    const mode: CheckMode = decision.active && decision.allowedChecks.includes(checkType) ? "AUTHORIZED" : "PASSIVE";

    const configFindings = reviewConfiguration({
      name: asset.name,
      type: asset.type,
      aiTools: asset.aiTools,
      aiPermissions: asset.aiPermissions,
      aiExternalIntegrations: asset.aiExternalIntegrations,
      aiHumanApprovalRequired: asset.aiHumanApprovalRequired,
      aiSensitiveDataAccess: asset.aiSensitiveDataAccess,
      mcpServerUrl: asset.mcpServerUrl,
      mcpAuthenticationEnabled: asset.mcpAuthenticationEnabled,
      mcpToolsExposed: asset.mcpToolsExposed,
      mcpWriteAccess: asset.mcpWriteAccess,
    });

    const actionable = configFindings.filter((f) => f.severity !== "INFO");
    const checkRun = await prisma.checkRun.create({
      data: {
        assetId,
        checkType,
        authorized: mode === "AUTHORIZED",
        mode,
        result: "COMPLETED",
        summary: `Configuration review: ${actionable.length} actionable item(s) out of ${configFindings.length} observations. ${decision.reason}`,
        resultData: JSON.stringify(configFindings, null, 2),
        findingsCount: actionable.length,
        dataMode: asset.dataMode,
        finishedAt: new Date(),
      },
    });

    const created: string[] = [];
    const updated: string[] = [];
    for (const f of actionable) {
      const fingerprint = `${checkType}:${f.title}`;
      const existing = await prisma.finding.findFirst({ where: { assetId, fingerprint } });
      if (existing) {
        await prisma.finding.update({
          where: { id: existing.id },
          data: {
            severity: f.severity,
            evidence: `${f.evidence}\n\nChecked: ${formatDate(new Date())}\nMethod: static configuration review (no requests sent to the agent or server).`,
            description: f.description,
            remediation: f.remediation,
            status: existing.status === "ACCEPTED_RISK" ? "ACCEPTED_RISK" : existing.status === "FIXED" ? "OPEN" : existing.status,
            verifiedAt: existing.status === "FIXED" ? null : existing.verifiedAt,
            updatedAt: new Date(),
          },
        });
        updated.push(f.title);
      } else {
        await prisma.finding.create({
          data: {
            title: f.title,
            assetId,
            category: f.category,
            severity: f.severity,
            status: "OPEN",
            description: f.description,
            evidence: `${f.evidence}\n\nChecked: ${formatDate(new Date())}\nMethod: static configuration review (no requests sent to the agent or server).`,
            source: `${asset.name} declared configuration`,
            evidenceData: JSON.stringify(f, null, 2),
            remediation: f.remediation,
            sourceType: checkType === "AI_AGENT_REVIEW" ? "AI_AGENT_REVIEW" : "MCP_REVIEW",
            fingerprint,
            dataMode: asset.dataMode,
          },
        });
        created.push(f.title);
      }
    }

    await prisma.asset.update({ where: { id: assetId }, data: { lastChecked: new Date() } });
    await logActivity({
      action: "check.executed",
      entity: "CheckRun",
      entityId: checkRun.id,
      assetId,
      summary: `Configuration review on ${asset.name} (${mode.toLowerCase()} mode): ${created.length} new, ${updated.length} updated.`,
      dataMode: asset.dataMode,
    });

    return {
      ok: true,
      mode,
      summary: checkRun.summary ?? "",
      created,
      updated,
      resolved: [],
      checkRunId: checkRun.id,
      configFindings: actionable.length,
    };
  }

  // --- Passive web / domain check. ---
  if (!asset.url) {
    return { ok: false, error: "This asset has no URL to check.", mode: "PASSIVE", summary: "", created: [], updated: [], resolved: [] };
  }

  const report = await runPassiveWebCheck(asset.url);
  const derived = deriveFindings(report);

  const checkRun = await prisma.checkRun.create({
    data: {
      assetId,
      checkType: "PASSIVE_WEB",
      authorized: decision.active,
      mode: decision.active ? "AUTHORIZED" : "PASSIVE",
      result: "COMPLETED",
      summary: `${summarizeReport(report, derived.length)} ${decision.reason}`,
      resultData: JSON.stringify(report, null, 2),
      findingsCount: derived.length,
      dataMode: asset.dataMode,
      finishedAt: new Date(),
    },
  });

  const created: string[] = [];
  const updated: string[] = [];
  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const d of derived) {
    seen.add(d.fingerprint);
    const fingerprint = `PASSIVE_WEB:${d.fingerprint}`;
    const existing = await prisma.finding.findFirst({ where: { assetId, fingerprint } });

    if (existing) {
      const stillOpen = existing.status !== "FIXED";
      await prisma.finding.update({
        where: { id: existing.id },
        data: {
          severity: d.severity,
          evidence: d.evidence,
          evidenceData: d.evidenceData,
          description: d.description,
          source: d.source,
          remediation: d.remediation,
          status: stillOpen ? existing.status : "OPEN",
          verifiedAt: null,
          updatedAt: new Date(),
        },
      });
      if (stillOpen) updated.push(d.title);
      else created.push(`${d.title} (re-opened by re-test)`);
    } else {
      const f = await prisma.finding.create({
        data: {
          title: d.title,
          assetId,
          category: d.category,
          severity: d.severity,
          status: "OPEN",
          description: d.description,
          evidence: d.evidence,
          evidenceData: d.evidenceData,
          source: d.source,
          remediation: d.remediation,
          sourceType: "PASSIVE_CHECK",
          fingerprint,
          dataMode: asset.dataMode,
        },
      });
      created.push(f.title);
      await checkRunFindingCreate(checkRun.id, f.id);
    }
  }

  // Anything previously raised by a passive web check but no longer observed
  // is only auto-closed if it is not ACCEPTED_RISK. This is the re-test step.
  const previous = await prisma.finding.findMany({
    where: { assetId, sourceType: "PASSIVE_CHECK", status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  for (const p of previous) {
    const fp = p.fingerprint.replace(/^PASSIVE_WEB:/, "");
    if (!seen.has(fp)) {
      await prisma.finding.update({
        where: { id: p.id },
        data: { status: "FIXED", verifiedAt: new Date(), updatedAt: new Date() },
      });
      resolved.push(p.title);
    }
  }

  await prisma.asset.update({ where: { id: assetId }, data: { lastChecked: new Date() } });

  await logActivity({
    action: "check.executed",
    entity: "CheckRun",
    entityId: checkRun.id,
    assetId,
    summary: `Safe passive check on ${asset.name}: ${report.passed} passed, ${report.failed} failed, ${report.warnings} warnings. ${created.length} new finding(s), ${resolved.length} resolved by re-test.`,
    dataMode: asset.dataMode,
  });

  if (created.length > 0) {
    await logActivity({
      action: "finding.created",
      entity: "Finding",
      assetId,
      summary: `${created.length} finding(s) raised on ${asset.name}: ${created.slice(0, 3).join(", ")}${created.length > 3 ? "…" : ""}`,
      dataMode: asset.dataMode,
    });
  }
  if (resolved.length > 0) {
    await logActivity({
      action: "finding.reverified",
      entity: "Finding",
      assetId,
      summary: `Re-test on ${asset.name} no longer reproduced: ${resolved.join(", ")}`,
      dataMode: asset.dataMode,
    });
  }

  return { ok: true, mode: decision.active ? "AUTHORIZED" : "PASSIVE", summary: checkRun.summary ?? "", created, updated, resolved, checkRunId: checkRun.id, report };
}

async function checkRunFindingCreate(checkRunId: string, findingId: string) {
  await prisma.checkRun.update({
    where: { id: checkRunId },
    data: { findings: { connect: { id: findingId } } },
  });
}
