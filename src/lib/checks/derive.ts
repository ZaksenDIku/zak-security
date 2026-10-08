/**
 * Maps passive check results to findings.
 *
 * RULE: a finding is only ever created from a CheckResult that carries
 * non-empty evidence. If evidence is empty the result is dropped, not
 * reported. This is the guardrail that stops Zak Security from producing a
 * vulnerability claim it cannot back up.
 */

import type { CheckResult, PassiveCheckReport } from "@/lib/checks/passive-web";
import type { Severity } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export interface DerivedFinding {
  fingerprint: string;
  title: string;
  category: string;
  severity: Severity;
  description: string;
  evidence: string;
  source: string;
  remediation: string;
  evidenceData: string;
}

/** Findings are only raised for FAIL and WARN verdicts. */
const RAISED_VERDICTS = new Set(["FAIL", "WARN"]);

const REMEDIATION: Record<string, string> = {
  transport_security: "Add the missing header, then re-run the safe header check.",
  xss_defense: "Add the missing browser hardening header, then re-run the safe header check.",
  clickjacking: "Restrict framing with CSP frame-ancestors and X-Frame-Options.",
  privacy: "Set a Referrer-Policy so URLs are not leaked to third parties.",
  browser_hardening: "Deny unused browser capabilities with Permissions-Policy.",
  availability: "Investigate the failing response in a non-production environment first.",
  disclosure: "Publish /.well-known/security.txt with a Contact field.",
  quality: "Low risk. Confirm the render path, then fix if it is genuinely broken.",
};

const CATEGORY_BY_CHECK: Record<string, string> = {
  HTTPS_AVAILABLE: "transport_security",
  HTTP_STATUS: "availability",
  HSTS_HEADER: "transport_security",
  CSP_HEADER: "xss_defense",
  X_CONTENT_TYPE_OPTIONS: "xss_defense",
  X_FRAME_OPTIONS: "clickjacking",
  REFERRER_POLICY: "privacy",
  PERMISSIONS_POLICY: "browser_hardening",
  PAGE_TITLE: "quality",
  VIEWPORT_META: "quality",
  COPYRIGHT_YEAR: "quality",
  SECURITY_TXT: "disclosure",
};

const SEVERITY_BY_CHECK: Record<string, Severity> = {
  HTTPS_AVAILABLE: "HIGH",
  HTTP_STATUS: "MEDIUM",
  HSTS_HEADER: "MEDIUM",
  CSP_HEADER: "LOW",
  X_CONTENT_TYPE_OPTIONS: "MEDIUM",
  X_FRAME_OPTIONS: "LOW",
  REFERRER_POLICY: "LOW",
  PERMISSIONS_POLICY: "INFO",
  PAGE_TITLE: "INFO",
  VIEWPORT_META: "INFO",
  COPYRIGHT_YEAR: "INFO",
  SECURITY_TXT: "INFO",
};

function isInformational(check: CheckResult): boolean {
  return ["PAGE_TITLE", "VIEWPORT_META", "PERMISSIONS_POLICY", "SECURITY_TXT", "COPYRIGHT_YEAR"].includes(
    check.id
  );
}

export function deriveFindings(report: PassiveCheckReport): DerivedFinding[] {
  const source = report.finalUrl;
  const checkedOn = formatDate(new Date());

  return report.checks
    .filter((c) => RAISED_VERDICTS.has(c.verdict))
    .filter((c) => c.evidence.trim().length > 0)
    .map((check) => {
      const category = CATEGORY_BY_CHECK[check.id] ?? "quality";
      const baseSeverity = SEVERITY_BY_CHECK[check.id] ?? "INFO";
      // Quality signals stay informational no matter what the check decided.
      const severity: Severity = isInformational(check) ? "INFO" : baseSeverity;

      return {
        fingerprint: `${check.id}`,
        title: check.label.startsWith("HSTS") ? "Missing HSTS Header" : check.label,
        category,
        severity,
        description: check.detail,
        evidence: `${check.evidence}\n\nSource: ${source}\nChecked: ${checkedOn}\nMethod: non-intrusive HTTP header and content inspection.`,
        source,
        remediation: REMEDIATION[category] ?? "Review and fix, then re-test.",
        evidenceData: JSON.stringify(
          {
            checkId: check.id,
            verdict: check.verdict,
            label: check.label,
            detail: check.detail,
            observedHeaders: report.headers,
            finalUrl: report.finalUrl,
            httpStatus: report.status,
            https: report.https,
            redirectHops: report.redirectHops,
            notes: report.notes,
          },
          null,
          2,
        ),
      };
    });
}

export function summarizeReport(report: PassiveCheckReport, findingCount: number): string {
  return `${report.passed} passed, ${report.failed} failed, ${report.warnings} warnings across ${report.checks.length} passive checks. HTTP ${report.status ?? "no response"} via ${report.https ? "HTTPS" : "HTTP"}. ${findingCount} finding${findingCount === 1 ? "" : "s"} raised.`;
}
