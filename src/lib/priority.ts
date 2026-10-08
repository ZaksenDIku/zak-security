/**
 * Transparent, rule-based priority engine.
 *
 * There is no opaque numeric score. Every priority is a list of plain
 * English reasons that a human can check against the underlying data.
 */

import type { FindingStatus, Severity } from "@/lib/constants";
import { daysBetween } from "@/lib/format";

export type PriorityTier = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export const TIER_STYLES: Record<PriorityTier, string> = {
  CRITICAL: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30",
  HIGH: "bg-orange-500/12 text-orange-300 ring-1 ring-orange-500/30",
  MEDIUM: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30",
  LOW: "bg-slate-500/12 text-slate-400 ring-1 border border-slate-600/40",
};

export const TIER_ORDER: Record<PriorityTier, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export interface PriorityInput {
  severity: Severity;
  status: FindingStatus;
  importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detectedAt: Date;
  authorizationActive: boolean;
  authorizationEndDate: Date | null;
  assetType: string;
  knownExploited: boolean;
}

export interface PriorityResult {
  tier: PriorityTier;
  reasons: string[];
  /** Label of the single most important driver, for the badge tooltip. */
  primaryReason: string;
}

export function computePriority(input: PriorityInput): PriorityResult {
  const reasons: string[] = [];

  if (input.knownExploited) {
    reasons.push(
      "Linked to a known exploited vulnerability, which means active exploitation is public and this is likely already being used against real targets."
    );
  }

  if (input.severity === "CRITICAL") {
    reasons.push("Severity is CRITICAL.");
  } else if (input.severity === "HIGH") {
    reasons.push("Severity is HIGH.");
  } else if (input.severity === "MEDIUM") {
    reasons.push("Severity is MEDIUM.");
  } else {
    reasons.push("Severity is INFO or LOW.");
  }

  if (input.importance === "CRITICAL") {
    reasons.push("The asset is marked business-critical, so downtime or exposure here is expensive.");
  } else if (input.importance === "HIGH") {
    reasons.push("The asset is marked high importance.");
  } else if (input.importance === "MEDIUM") {
    reasons.push("The asset is marked medium importance.");
  } else {
    reasons.push("The asset is marked low importance.");
  }

  const ageDays = Math.max(0, daysBetween(input.detectedAt));
  if (ageDays >= 30) {
    reasons.push(`Open for ${ageDays} days, so it has been carried for a long time.`);
  } else if (ageDays >= 14) {
    reasons.push(`Open for ${ageDays} days.`);
  } else if (ageDays >= 3) {
    reasons.push(`Open for ${ageDays} days.`);
  }

  if (input.authorizationActive) {
    reasons.push(
      "The asset has an active written authorization, so remediation and re-testing can proceed immediately."
    );
  } else if (input.authorizationEndDate) {
    const left = daysBetween(input.authorizationEndDate);
    if (left >= 0 && left <= 14) {
      reasons.push(
        `Authorization expires ${left === 0 ? "today" : `in ${left} days`}, so fix or re-test work has a deadline.`
      );
    } else if (left < 0) {
      reasons.push("The authorization has expired, so no further checks may run until it is renewed.");
    }
  } else {
    reasons.push(
      "No authorization is on file, so only basic public passive inspection is permitted and remediation must be done by the asset owner."
    );
  }

  if (input.assetType === "AI_AGENT" || input.assetType === "MCP_SERVER") {
    reasons.push(
      "The asset is an AI agent or MCP server, where a single misconfiguration can hand over broad data or action rights."
    );
  }

  // Tier decision, stated explicitly so the logic is auditable.
  let tier: PriorityTier = "LOW";
  if (input.knownExploited && (input.severity === "CRITICAL" || input.severity === "HIGH")) {
    tier = "CRITICAL";
  } else if (input.severity === "CRITICAL") {
    tier = "CRITICAL";
  } else if (input.severity === "HIGH" && input.importance !== "LOW") {
    tier = "HIGH";
  } else if (input.severity === "HIGH") {
    tier = "MEDIUM";
  } else if (input.severity === "MEDIUM" && (ageDays >= 14 || input.importance === "CRITICAL")) {
    tier = "MEDIUM";
  } else if (input.severity === "MEDIUM") {
    tier = "LOW";
  }

  return { tier, reasons, primaryReason: reasons[0] ?? "No contributing factors." };
}
