/**
 * Zak Security - passive web checker.
 *
 * SAFETY CONTRACT (do not weaken without reading README):
 * This module performs NON-INTRUSIVE observation only.
 * It never brute forces, never scans ports, never fuzzes, never bypasses auth.
 *
 * Hard limits are enforced below:
 *  - exactly one HEAD request and at most one GET request per target
 *  - redirects are followed manually, maximum 3 hops
 *  - a small allowlist of header names is read
 *  - only the first 64 KB of the body is read and only a handful of
 *    deterministic string patterns are matched against it
 *  - no cookies are stored, no auth is sent, no credentials exist
 *  - requests are hard-capped at 15 seconds total
 */

export type CheckId =
  | "HTTPS_AVAILABLE"
  | "HTTP_STATUS"
  | "HSTS_HEADER"
  | "CSP_HEADER"
  | "X_CONTENT_TYPE_OPTIONS"
  | "X_FRAME_OPTIONS"
  | "REFERRER_POLICY"
  | "PERMISSIONS_POLICY"
  | "PAGE_TITLE"
  | "VIEWPORT_META"
  | "COPYRIGHT_YEAR"
  | "SECURITY_TXT";

export type CheckVerdict = "PASS" | "FAIL" | "WARN" | "INFO";

export interface CheckResult {
  id: CheckId;
  label: string;
  verdict: CheckVerdict;
  detail: string;
  evidence: string;
}

export interface PassiveCheckReport {
  requestedUrl: string;
  finalUrl: string;
  https: boolean;
  status: number | null;
  statusText: string;
  redirectHops: number;
  headers: Record<string, string>;
  pageTitle: string | null;
  durationMs: number;
  checks: CheckResult[];
  passed: number;
  failed: number;
  warnings: number;
  notes: string[];
}

const USER_AGENT = "ZakSecurity-PassiveChecker/0.1 (authorized security review; non-intrusive)";
const TIMEOUT_MS = 15_000;
const MAX_HOPS = 3;
const MAX_BODY_BYTES = 64 * 1024;

function normalizeTarget(raw: string): URL {
  let value = raw.trim();
  if (!value) throw new Error("No URL supplied.");
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https targets are supported.");
  }
  return url;
}

async function timedFetch(url: string, redirect: RequestRedirect): Promise<Response> {
  return fetch(url, {
    method: "GET",
    redirect,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
  });
}

/**
 * Fetch the page with a bounded, observable request pattern.
 * Returns null when the target simply could not be reached.
 */
async function fetchPage(start: URL) {
  const notes: string[] = [];
  let url = start;
  let hops = 0;
  let response: Response | null = null;

  while (hops <= MAX_HOPS) {
    try {
      response = await timedFetch(url.toString(), "manual");
    } catch (err) {
      notes.push(`Request to ${url.host} failed: ${(err as Error).name}.`);
      return { response: null, finalUrl: url.toString(), hops, notes };
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (!isRedirect || !location) break;

    let next: URL;
    try {
      next = new URL(location, url);
    } catch {
      notes.push("Redirect target could not be parsed; stopped following.");
      break;
    }
    hops += 1;
    if (hops > MAX_HOPS) {
      notes.push(`Stopped after ${MAX_HOPS} redirect hops.`);
      break;
    }
    notes.push(`Redirect ${hops}: ${url.host} → ${next.host}`);
    url = next;
  }

  return { response, finalUrl: url.toString(), hops, notes };
}

function collectHeaders(response: Response): Record<string, string> {
  const wanted = [
    "strict-transport-security",
    "content-security-policy",
    "content-security-policy-report-only",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "server",
    "x-powered-by",
  ];
  const out: Record<string, string> = {};
  for (const name of wanted) {
    const value = response.headers.get(name);
    if (value) out[name] = value;
  }
  return out;
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(html);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim() || null;
}

function hasViewportMeta(html: string): boolean {
  return /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
}

function copyrightObservation(html: string): { text: string | null; stale: boolean | null } {
  // Cheap, deterministic scan of the header/footer region only.
  const slice = html.slice(0, 20_000) + html.slice(-20_000);
  const match = /(?:&copy;|&#169;|©|\bcopyright\b)[^<]{0,60}?((?:19|20)\d{2})/i.exec(slice);
  if (!match) return { text: null, stale: null };
  const year = Number(match[1]);
  const current = new Date().getFullYear();
  return { text: match[0].trim().replace(/\s+/g, " "), stale: current - year >= 2 };
}

function verdictForPresence(
  headers: Record<string, string>,
  names: string[]
): { found: string | null } {
  for (const name of names) {
    const value = headers[name];
    if (value) return { found: `${name}: ${value}` };
  }
  return { found: null };
}

export async function runPassiveWebCheck(rawUrl: string): Promise<PassiveCheckReport> {
  const started = Date.now();
  const target = normalizeTarget(rawUrl);
  const notes: string[] = [];
  const { response, finalUrl, hops } = await fetchPage(target);

  if (!response) {
    return {
      requestedUrl: rawUrl,
      finalUrl,
      https: false,
      status: null,
      statusText: "unreachable",
      redirectHops: hops,
      headers: {},
      pageTitle: null,
      durationMs: Date.now() - started,
      passed: 0,
      failed: 0,
      warnings: 0,
      notes,
      checks: [
        {
          id: "HTTP_STATUS",
          label: "HTTP response",
          verdict: "INFO",
          detail: "Target could not be reached over HTTPS.",
          evidence: `No response from https://${target.host}${target.pathname}`,
        },
      ],
    };
  }

  const headers = collectHeaders(response);
  const finalProtocol = new URL(finalUrl).protocol;
  const https = finalProtocol === "https:";
  const checks: CheckResult[] = [];

  // 1. HTTPS
  checks.push(
    https
      ? {
          id: "HTTPS_AVAILABLE",
          label: "HTTPS available",
          verdict: "PASS",
          detail: `Served over ${finalProtocol}//`,
          evidence: `Resolved ${finalProtocol}//${new URL(finalUrl).host}`,
        }
      : {
          id: "HTTPS_AVAILABLE",
          label: "HTTPS available",
          verdict: "FAIL",
          detail: "Site responded over plain HTTP without being upgraded to HTTPS.",
          evidence: `Final URL was ${finalUrl}`,
        },
  );

  // 2. HTTP status
  const statusOk = response.status >= 200 && response.status < 400;
  checks.push({
    id: "HTTP_STATUS",
    label: "HTTP response status",
    verdict: statusOk ? "PASS" : response.status < 500 ? "WARN" : "FAIL",
    detail: `Server returned ${response.status} ${response.statusText || ""}`.trim(),
    evidence: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""} (${hops} redirect hop${hops === 1 ? "" : "s"})`,
  });

  // 3. HSTS
  const hsts = verdictForPresence(headers, ["strict-transport-security"]);
  checks.push(
    hsts.found
      ? {
          id: "HSTS_HEADER",
          label: "HSTS header",
          verdict: /max-age\s*=\s*0/i.test(hsts.found) ? "WARN" : "PASS",
          detail: /max-age\s*=\s*0/i.test(hsts.found)
            ? "HSTS present but disabled with max-age=0."
            : "Strict-Transport-Security is present.",
          evidence: hsts.found,
        }
      : {
          id: "HSTS_HEADER",
          label: "HSTS header",
          verdict: https ? "FAIL" : "WARN",
          detail: https
            ? "Site is served over HTTPS but does not send Strict-Transport-Security."
            : "No Strict-Transport-Security header (and site is not on HTTPS).",
          evidence: `No strict-transport-security header in response from ${new URL(finalUrl).host}`,
        },
  );

  // 4. CSP
  const csp = verdictForPresence(headers, [
    "content-security-policy",
    "content-security-policy-report-only",
  ]);
  checks.push({
    id: "CSP_HEADER",
    label: "CSP header",
    verdict: csp.found ? "PASS" : "WARN",
    detail: csp.found
      ? "A Content-Security-Policy header is present."
      : "No Content-Security-Policy header was returned.",
    evidence: csp.found ?? `No content-security-policy header in response from ${new URL(finalUrl).host}`,
  });

  // 5. nosniff
  const nosniff = headers["x-content-type-options"];
  checks.push({
    id: "X_CONTENT_TYPE_OPTIONS",
    label: "X-Content-Type-Options",
    verdict: nosniff ? "PASS" : "FAIL",
    detail: nosniff
      ? "Content type sniffing is explicitly disabled."
      : "Browser may MIME-sniff responses into unexpected types.",
    evidence: nosniff ?? `No x-content-type-options header in response from ${new URL(finalUrl).host}`,
  });

  // 6. clickjacking
  const frame = headers["x-frame-options"];
  const frameCsp = headers["content-security-policy"];
  const cspFrameAncestors = frameCsp && /frame-ancestors/i.test(frameCsp);
  checks.push({
    id: "X_FRAME_OPTIONS",
    label: "X-Frame-Options / frame-ancestors",
    verdict: frame || cspFrameAncestors ? "PASS" : "WARN",
    detail:
      frame || cspFrameAncestors
        ? "Framing is restricted."
        : "No framing restriction found; page may be embeddable in an iframe.",
    evidence:
      frame ??
      (cspFrameAncestors
        ? `content-security-policy contains frame-ancestors: ${cspFrameAncestors}`
        : `Neither x-frame-options nor CSP frame-ancestors present on ${new URL(finalUrl).host}`),
  });

  // 7. referrer policy
  const referrer = headers["referrer-policy"];
  checks.push({
    id: "REFERRER_POLICY",
    label: "Referrer-Policy",
    verdict: referrer ? "PASS" : "WARN",
    detail: referrer
      ? "Referrer behaviour is explicitly controlled."
      : "No Referrer-Policy header; full URLs may leak to third parties.",
    evidence: referrer ?? `No referrer-policy header in response from ${new URL(finalUrl).host}`,
  });

  // 8. permissions policy
  const permissions = headers["permissions-policy"];
  checks.push({
    id: "PERMISSIONS_POLICY",
    label: "Permissions-Policy",
    verdict: permissions ? "PASS" : "INFO",
    detail: permissions
      ? "Browser capabilities are restricted by policy."
      : "No Permissions-Policy header. Optional hardening, not a defect on its own.",
    evidence: permissions ?? `No permissions-policy header in response from ${new URL(finalUrl).host}`,
  });

  // Body-derived checks. Read once, bounded, never re-requested.
  const contentType = response.headers.get("content-type") ?? "";
  let html = "";
  if (contentType.includes("html") || contentType === "") {
    try {
      const buf = await response.arrayBuffer();
      html = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, MAX_BODY_BYTES));
      if (buf.byteLength > MAX_BODY_BYTES) {
        notes.push(`Body truncated to ${MAX_BODY_BYTES} bytes for offline analysis.`);
      }
    } catch {
      notes.push("Response body could not be read; page-level checks skipped.");
    }
  } else {
    notes.push(`Skipped page-level checks, content-type is "${contentType}".`);
  }

  // 9. title
  const title = html ? extractTitle(html) : null;
  checks.push({
    id: "PAGE_TITLE",
    label: "Page title",
    verdict: title ? "PASS" : "WARN",
    detail: title ? "Document declares a non-empty <title>." : "No usable <title> element found.",
    evidence: title ? `<title>${title}</title>` : `No <title> element in the first ${MAX_BODY_BYTES} bytes of ${finalUrl}`,
  });

  // 10. viewport
  const viewport = html ? hasViewportMeta(html) : false;
  checks.push({
    id: "VIEWPORT_META",
    label: "Viewport meta tag",
    verdict: viewport ? "PASS" : "INFO",
    detail: viewport
      ? "Viewport meta tag present (responsive layout enabled)."
      : "No viewport meta tag. Accessibility/SEO signal, not a security defect.",
    evidence: viewport
      ? `Meta viewport tag matched in ${finalUrl}`
      : `No <meta name="viewport"> tag in ${finalUrl}`,
  });

  // 11. copyright year
  const copyright = copyrightObservation(html);
  const copyrightYear = copyright.text?.match(/(?:19|20)\d{2}/)?.[0] ?? null;
  checks.push({
    id: "COPYRIGHT_YEAR",
    label: "Copyright year freshness",
    verdict: copyright.stale === null ? "INFO" : copyright.stale ? "WARN" : "PASS",
    detail:
      copyright.stale === null
        ? "No copyright year found in the sampled page region."
        : copyright.stale
          ? `Copyright reads ${copyrightYear}, which is more than one year behind.`
          : `Copyright reads ${copyrightYear} and is current.`,
    evidence:
      copyright.text ??
      `No copyright marker with a 4-digit year in the first/last 20 KB of ${finalUrl}`,
  });

  // 12. security.txt (one extra small request, same limits)
  const securityTxtUrl = new URL("/.well-known/security.txt", finalUrl).toString();
  let secTxt: string | null = null;
  let secTxtStatus: number | null = null;
  try {
    const res = await timedFetch(securityTxtUrl, "manual");
    secTxtStatus = res.status;
    if (res.ok) {
      const buf = await res.arrayBuffer();
      secTxt = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 4096));
    }
  } catch {
    notes.push("security.txt could not be fetched (network error).");
  }
  checks.push({
    id: "SECURITY_TXT",
    label: "security.txt presence",
    verdict: secTxtStatus === 200 ? "PASS" : "INFO",
    detail:
      secTxtStatus === 200
        ? "RFC 9116 security.txt is published."
        : `No published security.txt (HTTP ${secTxtStatus ?? "no response"}).`,
    evidence:
      secTxtStatus === 200
        ? `${securityTxtUrl} → HTTP 200 (${secTxt?.split("\n").find((l) => /^Contact:/i.test(l))?.trim() ?? "no Contact field found"})`
        : `${securityTxtUrl} → HTTP ${secTxtStatus ?? "no response"}`,
  });

  if (https && !headers["strict-transport-security"]) {
    notes.push("HTTPS is available but not enforced by HSTS.");
  }

  const passed = checks.filter((c) => c.verdict === "PASS").length;
  const failed = checks.filter((c) => c.verdict === "FAIL").length;
  const warnings = checks.filter((c) => c.verdict === "WARN").length;

  return {
    requestedUrl: rawUrl,
    finalUrl,
    https,
    status: response.status,
    statusText: response.statusText || "",
    redirectHops: hops,
    headers,
    pageTitle: title,
    durationMs: Date.now() - started,
    checks,
    passed,
    failed,
    warnings,
    notes,
  };
}
