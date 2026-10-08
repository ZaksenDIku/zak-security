/**
 * AI Agent / MCP configuration review.
 *
 * SAFETY CONTRACT:
 * These functions read configuration that the operator has already entered
 * into Zak Security. They never connect to, probe, or attack an agent or MCP
 * server. No prompt injection is generated, no tool is invoked, no payload is
 * sent. This is a checklist against human-declared configuration only.
 */

import type { Severity } from "@/lib/constants";

export interface ConfigFinding {
  title: string;
  category: string;
  severity: Severity;
  description: string;
  evidence: string;
  remediation: string;
}

export interface AssetConfigInput {
  name: string;
  type: string;
  aiTools?: string;
  aiPermissions?: string;
  aiExternalIntegrations?: string;
  aiHumanApprovalRequired?: boolean;
  aiSensitiveDataAccess?: boolean;
  mcpServerUrl?: string | null;
  mcpAuthenticationEnabled?: boolean;
  mcpToolsExposed?: string;
  mcpWriteAccess?: boolean;
  notes?: string | null;
}

function list(value?: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const WRITE_HINTS = ["write", "delete", "update", "create", "exec", "shell", "push", "send", "post", "deploy"];
const READ_HINTS = ["read", "list", "get", "search", "query", "fetch", "view", "describe"];
const SENSITIVE_HINTS = ["pii", "personal", "sensitive", "secret", "credential", "financial", "health", "customer", "payment", "pii_", "ssn", "bank"];
const NETWORK_HINTS = ["http", "external", "third-party", "third_party", "api", "webhook", "remote", "public", "browser", "slack", "github", "email", "stripe", "openai"];

export function reviewAiAgent(asset: AssetConfigInput): ConfigFinding[] {
  const tools = list(asset.aiTools);
  const permissions = list(asset.aiPermissions);
  const external = list(asset.aiExternalIntegrations);
  const findings: ConfigFinding[] = [];
  const evidenceBase = `Configuration review of asset "${asset.name}" (AI_AGENT), human-declared settings.`;

  const writeTools = tools.filter((t) => WRITE_HINTS.some((h) => t.toLowerCase().includes(h)));
  const readTools = tools.filter((t) => READ_HINTS.some((h) => t.toLowerCase().includes(h)));
  const sensitivePerms = permissions.filter((p) => SENSITIVE_HINTS.some((h) => p.toLowerCase().includes(h)));
  const networkPerms = permissions.filter((p) => NETWORK_HINTS.some((h) => p.toLowerCase().includes(h)));

  if (tools.length === 0) {
    findings.push({
      title: "AI agent tool inventory is empty",
      category: "ai_agent_config",
      severity: "LOW",
      description:
        "No tools are declared for this AI agent. Either the inventory is incomplete or the agent cannot perform any work. An undocumented tool surface is the more common case and blocks review.",
      evidence: `${evidenceBase} aiTools is empty.`,
      remediation:
        "Record the agent's full tool list so the configuration review has something to assess. Reviewers cannot evaluate an undeclared tool surface.",
    });
  } else if (writeTools.length === 0 && readTools.length > 0) {
    findings.push({
      title: "AI agent exposes read-only tools",
      category: "ai_agent_config",
      severity: "LOW",
      description:
        "Every declared tool appears to be read-only. Read-only agents have a materially smaller blast radius because a mishandled instruction cannot mutate state.",
      evidence: `${evidenceBase} Tools declared: ${tools.join(", ")}. No write-capable tool name detected.`,
      remediation:
        "Keep the agent read-only where the use case allows it. Re-review if write tools are added later.",
    });
  } else if (writeTools.length > 0 && !asset.aiHumanApprovalRequired) {
    findings.push({
      title: "AI agent has write-capable tools with no human approval gate",
      category: "ai_agent_config",
      severity: "HIGH",
      description:
        "The agent can change state and humanApprovalRequired is false. A wrong or manipulated instruction becomes an immediate, unreviewed action. This is the highest-value guardrail to restore on an agent.",
      evidence: `${evidenceBase} Write-capable tools: ${writeTools.join(", ")}. aiHumanApprovalRequired = false.`,
      remediation:
        "Set humanApprovalRequired = true so every write tool call is confirmed by a human before execution.",
    });
  } else if (writeTools.length > 0) {
    findings.push({
      title: "AI agent holds write-capable tools",
      category: "ai_agent_config",
      severity: "MEDIUM",
      description:
        "The agent can change state, but a human approval gate is configured. This is the correct posture; the residual risk is the breadth of the write surface.",
      evidence: `${evidenceBase} Write-capable tools: ${writeTools.join(", ")}. aiHumanApprovalRequired = true.`,
      remediation:
        "Keep the write tool list as small as possible and log every approved write so the trail stays reviewable.",
    });
  }

  if (sensitivePerms.length > 0 && external.length > 0) {
    findings.push({
      title: "AI agent combines external integrations with sensitive data access",
      category: "ai_agent_config",
      severity: "HIGH",
      description:
        "The agent can reach external systems and also holds permissions touching sensitive data. Data can leave the trust boundary without the operator necessarily seeing it in context.",
      evidence: `${evidenceBase} External integrations: ${external.join(", ")}. Sensitive permissions: ${sensitivePerms.join(", ")}.`,
      remediation:
        "Split the agent, or scope the sensitive permission to a separate agent that has no outbound integrations. Require approval on the sensitive read path.",
    });
  } else if (external.length > 0) {
    findings.push({
      title: "AI agent has outbound external integrations",
      category: "ai_agent_config",
      severity: "MEDIUM",
      description:
        "The agent can send data to systems outside its trust boundary. Each integration is an egress path, and untrusted third-party responses can come back as instructions.",
      evidence: `${evidenceBase} External integrations: ${external.join(", ")}.`,
      remediation:
        "Document which data classes may leave through each integration, and treat all third-party response content as untrusted input rather than instructions.",
    });
  }

  if (networkPerms.length > 0 && !asset.aiHumanApprovalRequired) {
    findings.push({
      title: "Network-capable AI agent runs without human approval",
      category: "ai_agent_config",
      severity: "MEDIUM",
      description:
        "The agent can perform network operations and no human approval is required. Unattended egress is hard to detect after the fact.",
      evidence: `${evidenceBase} Network-like permissions: ${networkPerms.join(", ")}. aiHumanApprovalRequired = false.`,
      remediation: "Enable human approval for network-capable operations, or constrain the agent to a fixed outbound allowlist.",
    });
  }

  return findings;
}

export function reviewMcpServer(asset: AssetConfigInput): ConfigFinding[] {
  const tools = list(asset.mcpToolsExposed);
  const findings: ConfigFinding[] = [];
  const host = asset.mcpServerUrl || "the configured server URL";
  const evidenceBase = `Configuration review of MCP server asset "${asset.name}" at ${host}, human-declared settings.`;

  if (!asset.mcpAuthenticationEnabled) {
    findings.push({
      title: "MCP server has no authentication configured",
      category: "mcp_config",
      severity: "HIGH",
      description:
        "Anyone who can reach the server endpoint can list and invoke its tools. MCP servers frequently front internal data, so an unauthenticated endpoint is equivalent to exposing that data directly.",
      evidence: `${evidenceBase} mcpAuthenticationEnabled = false.`,
      remediation:
        "Enable authentication on the MCP server. Bind to localhost or a private network as an interim measure, and require a token or mTLS on every connection.",
    });
  } else {
    findings.push({
      title: "MCP server requires authentication",
      category: "mcp_config",
      severity: "INFO",
      description:
        "Authentication is enabled, which is the expected baseline. This is recorded as a positive observation rather than a finding to fix.",
      evidence: `${evidenceBase} mcpAuthenticationEnabled = true.`,
      remediation: "No action required. Confirm the credential is short-lived and scoped to the minimum set of tools.",
    });
  }

  if (asset.mcpWriteAccess) {
    findings.push({
      title: "MCP server exposes write access to connected clients",
      category: "mcp_config",
      severity: tools.length > 0 && !asset.mcpAuthenticationEnabled ? "HIGH" : "MEDIUM",
      description:
        "Connected clients can mutate server state. MCP tool descriptions are untrusted input from the client's perspective, so a confusing or misleading tool description can steer a legitimate client into a destructive call.",
      evidence: `${evidenceBase} mcpWriteAccess = true. Tools exposed: ${tools.length > 0 ? tools.join(", ") : "not declared"}.`,
      remediation:
        "Prefer read-only tools by default. If write access is required, expose it behind a separate server or tool, and require explicit confirmation in the client for destructive operations.",
    });
  } else if (tools.length > 0) {
    findings.push({
      title: "MCP server exposes read-only tools",
      category: "mcp_config",
      severity: "LOW",
      description:
        "No write access is declared. The worst outcome of a confused or manipulated client call is disclosure, not state change.",
      evidence: `${evidenceBase} mcpWriteAccess = false. Tools exposed: ${tools.join(", ")}.`,
      remediation: "No immediate action. Confirm tool descriptions match the actual behaviour they grant.",
    });
  }

  if (tools.length === 0) {
    findings.push({
      title: "MCP server tool inventory is not documented",
      category: "mcp_config",
      severity: "INFO",
      description:
        "No tools are declared, so the real tool surface cannot be reviewed. An undocumented surface is the most common gap found in MCP reviews.",
      evidence: `${evidenceBase} mcpToolsExposed is empty.`,
      remediation: "Record the exposed tool list with a one-line description of what each tool is allowed to do.",
    });
  }

  return findings;
}

export function reviewConfiguration(asset: AssetConfigInput): ConfigFinding[] {
  if (asset.type === "AI_AGENT") return reviewAiAgent(asset);
  if (asset.type === "MCP_SERVER") return reviewMcpServer(asset);
  return [];
}
