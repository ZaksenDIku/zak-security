export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FindingStatus = "OPEN" | "IN_PROGRESS" | "FIXED" | "ACCEPTED_RISK";
export type AssetType = "WEBSITE" | "DOMAIN" | "GITHUB_REPO" | "AI_AGENT" | "MCP_SERVER";
export type AssetStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type AuthorizationStatus = "ACTIVE" | "EXPIRED" | "NOT_AUTHORIZED";
export type CheckType =
  | "PASSIVE_WEB"
  | "SAFE_HTTP"
  | "DEPENDENCY_CHECK"
  | "GITHUB_SECURITY"
  | "AI_AGENT_REVIEW"
  | "MCP_REVIEW";
export type AssetImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type LeadStatus = "NEW" | "RESEARCHING" | "CONTACTED" | "QUALIFIED" | "NOT_INTERESTED";
export type DataMode = "REAL" | "DEMO";

export const SEVERITY_ORDER: Severity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function severityWeight(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30",
  HIGH: "bg-orange-500/12 text-orange-300 ring-1 ring-orange-500/30",
  MEDIUM: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30",
  LOW: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-500/30",
  INFO: "bg-slate-500/12 text-slate-300 ring-1 ring-slate-500/30",
};

export const FINDING_STATUS_STYLES: Record<FindingStatus, string> = {
  OPEN: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30",
  IN_PROGRESS: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-500/30",
  FIXED: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30",
  ACCEPTED_RISK: "bg-slate-500/12 text-slate-300 ring-1 ring-slate-500/30",
};

export const AUTH_STATUS_STYLES: Record<AuthorizationStatus, string> = {
  ACTIVE: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30",
  EXPIRED: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30",
  NOT_AUTHORIZED: "bg-slate-500/12 text-slate-400 ring-1 ring-slate-500/30",
};

export const ASSET_TYPE_STYLES: Record<AssetType, string> = {
  WEBSITE: "bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-500/30",
  DOMAIN: "bg-indigo-500/12 text-indigo-300 ring-1 ring-indigo-500/30",
  GITHUB_REPO: "bg-zinc-400/12 text-zinc-200 ring-1 ring-zinc-400/25",
  AI_AGENT: "bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/30",
  MCP_SERVER: "bg-fuchsia-500/12 text-fuchsia-300 ring-1 ring-fuchsia-500/30",
};

export const IMPORTANCE_STYLES: Record<AssetImportance, string> = {
  CRITICAL: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30",
  HIGH: "bg-orange-500/12 text-orange-300 ring-1 ring-orange-500/30",
  MEDIUM: "bg-slate-500/12 text-slate-300 ring-1 ring-slate-500/30",
  LOW: "bg-slate-500/12 text-slate-400 ring-1 border border-slate-600/40",
};

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-500/30",
  RESEARCHING: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30",
  CONTACTED: "bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/30",
  QUALIFIED: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30",
  NOT_INTERESTED: "bg-slate-500/12 text-slate-400 ring-1 border border-slate-600/40",
};

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  PASSIVE_WEB: "Passive website inspection",
  SAFE_HTTP: "Safe HTTP header check",
  DEPENDENCY_CHECK: "Dependency advisory lookup",
  GITHUB_SECURITY: "GitHub security posture",
  AI_AGENT_REVIEW: "AI agent configuration review",
  MCP_REVIEW: "MCP server configuration review",
};

export function isKnownExploitedStyle(known: boolean): string {
  return known
    ? "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/30"
    : "bg-slate-500/12 text-slate-400 ring-1 border border-slate-600/40";
}
