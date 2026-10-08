/**
 * Rule-based remediation templates.
 *
 * These work with zero configuration. If OPENAI_API_KEY is present, an optional
 * provider can augment the text, but the templates below remain the fallback
 * and the source of truth for the concrete code snippets.
 */

import type { Severity } from "@/lib/constants";

export interface FixExample {
  stack: string;
  snippet: string;
}

export interface RemediationTemplate {
  key: string;
  title: string;
  category: string;
  whyItMatters: string;
  recommendedFix: string;
  examples: FixExample[];
  verification: string;
}

const TEMPLATES: RemediationTemplate[] = [
  {
    key: "hsts",
    title: "Missing HSTS Header",
    category: "transport_security",
    whyItMatters:
      "Strict-Transport-Security tells browsers to reach the site over HTTPS only for a fixed period. Without it, a user on an untrusted network can be downgraded to plain HTTP on the very first request, which exposes session cookies and page content to anyone in the middle. The downgrade attack is the reason HSTS matters more than the HTTPS itself.",
    recommendedFix:
      "Add a Strict-Transport-Security header with a long max-age, enable includeSubDomains once you are sure every subdomain is HTTPS-only, and optionally add preload. Start at six months before you submit a domain to the preload list, because preload is hard to undo.",
    examples: [
      {
        stack: "Next.js",
        snippet: `// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;`,
      },
      {
        stack: "nginx",
        snippet: `# /etc/nginx/conf.d/security-headers.conf
server {
    listen 443 ssl http2;
    server_name example.com;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
}`,
      },
      {
        stack: "Spring Boot",
        snippet: `# application.yml
server:
  ssl:
    redirect:
      enabled: true
  forward-headers-strategy: framework

# WebSecurityConfig.java
http.headers(headers -> headers
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true)
        .preload(true)
        .maxAgeInSeconds(63072000))
);`,
      },
    ],
    verification:
      "Re-run the safe header check on the asset. Strict-Transport-Security should be reported as present, and the finding should close as fixed.",
  },
  {
    key: "csp",
    title: "Missing Content-Security-Policy Header",
    category: "xss_defense",
    whyItMatters:
      "A Content-Security-Policy is the browser-enforced boundary that decides which scripts, styles and frames are allowed to run. Without it, a single injection bug has no second line of defence. With it, injected markup usually cannot execute at all.",
    recommendedFix:
      "Start in report-only mode so nothing breaks while you collect violations, then move to enforcing. Avoid the unsafe-inline keyword; use nonces or hashes instead.",
    examples: [
      {
        stack: "Next.js",
        snippet: `// next.config.js — report-only first
const csp = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

headers: [
  { key: "Content-Security-Policy-Report-Only", value: csp },
]`,
      },
      {
        stack: "nginx",
        snippet: `add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;`,
      },
      {
        stack: "Spring Boot",
        snippet: `http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"))
);`,
      },
    ],
    verification:
      "Re-run the safe header check. Move the policy from report-only to enforcing once the report shows no legitimate violations.",
  },
  {
    key: "nosniff",
    title: "Missing X-Content-Type-Options Header",
    category: "xss_defense",
    whyItMatters:
      "Browsers guess the content type of a response when the server does not say what it is. That guessing is how an uploaded file or a mis-served API response gets executed as script. One header removes the guessing.",
    recommendedFix:
      "Send X-Content-Type-Options: nosniff on every response, and make sure Content-Type is set correctly at the source.",
    examples: [
      {
        stack: "Next.js",
        snippet: `{ key: "X-Content-Type-Options", value: "nosniff" }`,
      },
      {
        stack: "nginx",
        snippet: `add_header X-Content-Type-Options "nosniff" always;`,
      },
      {
        stack: "Spring Boot",
        snippet: `http.headers(headers -> headers
    .contentTypeOptions(Customizer.withDefaults())
);`,
      },
    ],
    verification: "Re-run the safe header check and confirm x-content-type-options is reported.",
  },
  {
    key: "xframe",
    title: "Missing Clickjacking Protection (X-Frame-Options / CSP frame-ancestors)",
    category: "clickjacking",
    whyItMatters:
      "Without a framing restriction, any third-party page can embed yours in a transparent iframe and trick a user into clicking buttons they cannot see. The victim stays on your domain, so the attack inherits your trust.",
    recommendedFix:
      "Prefer CSP frame-ancestors because it is the current standard, and keep X-Frame-Options for older browsers.",
    examples: [
      {
        stack: "Next.js",
        snippet: `{ key: "X-Frame-Options", value: "DENY" },
// plus: frame-ancestors 'none' in the CSP`,
      },
      {
        stack: "nginx",
        snippet: `add_header X-Frame-Options "SAMEORIGIN" always;`,
      },
      {
        stack: "Spring Boot",
        snippet: `http.headers(headers -> headers
    .frameOptions(frame -> frame.deny())
);`,
      },
    ],
    verification: "Re-run the safe header check and confirm the framing check passes.",
  },
  {
    key: "referrer_policy",
    title: "Missing Referrer-Policy Header",
    category: "privacy",
    whyItMatters:
      "The default behaviour sends the full request URL to any third party the page loads assets from. URLs often contain tokens, invite codes or internal identifiers, so the default leaks more than most sites intend.",
    recommendedFix:
      "Use a strict-origin-when-cross-origin policy, or no-referrer if you do not need referrer data at all.",
    examples: [
      { stack: "Next.js", snippet: `{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }` },
      { stack: "nginx", snippet: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;` },
      {
        stack: "Spring Boot",
        snippet: `http.headers(headers -> headers
    .referrerPolicy(referrer -> referrer
        .policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
);`,
      },
    ],
    verification: "Re-run the safe header check and confirm referrer-policy is reported.",
  },
  {
    key: "permissions_policy",
    title: "Missing Permissions-Policy Header",
    category: "browser_hardening",
    whyItMatters:
      "Permissions-Policy removes browser capabilities from the page. Not every page needs camera, microphone, geolocation or payment access, and an injected script has no use for capabilities the page never declared.",
    recommendedFix:
      "Deny capabilities you do not use. An empty or minimal allowlist is normal and correct.",
    examples: [
      {
        stack: "Next.js",
        snippet: `{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" }`,
      },
      {
        stack: "nginx",
        snippet: `add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;`,
      },
      { stack: "Spring Boot", snippet: `http.headers(headers -> headers.permissionsPolicyHeader("camera=(), microphone=(), geolocation=()"));` },
    ],
    verification: "Re-run the safe header check and confirm the permissions-policy check reports a value.",
  },
  {
    key: "https",
    title: "HTTPS Not Available",
    category: "transport_security",
    whyItMatters:
      "Without HTTPS, everything on the page including credentials and session cookies travels in clear text and can be read or modified by anyone on the path. This is the base layer everything else depends on.",
    recommendedFix:
      "Obtain a certificate (Let's Encrypt is free and automatable) and redirect all plain HTTP to HTTPS. Only add HSTS after HTTPS is confirmed working on every path.",
    examples: [
      {
        stack: "nginx",
        snippet: `server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}`,
      },
      { stack: "Next.js", snippet: `// Vercel and most platforms terminate TLS for you.
// If you self-host, terminate TLS at the proxy and forward X-Forwarded-Proto.` },
      {
        stack: "Spring Boot",
        snippet: `server:
  ssl:
    enabled: true
    port: 443`,
      },
    ],
    verification: "Re-run the safe check and confirm HTTPS available now passes.",
  },
  {
    key: "http_status",
    title: "Unhealthy HTTP Response Status",
    category: "availability",
    whyItMatters:
      "A 5xx or a broken redirect chain means the site is effectively down for users. A 404 on the site root usually means a deployment or DNS problem rather than an attack.",
    recommendedFix:
      "Check the deploy, the reverse proxy upstream and the certificate validity, in that order. Capture the failing request in a non-production environment before changing production.",
    examples: [
      { stack: "curl", snippet: `curl -sS -o /dev/null -w '%{http_code} %{url_effective}\\n' -L https://example.dk` },
      { stack: "nginx", snippet: `# Look for the failing upstream in the error log:
# /var/log/nginx/error.log
# then verify directly:
curl -I http://127.0.0.1:3000/health` },
      { stack: "Spring Boot", snippet: `curl -s http://127.0.0.1:8080/actuator/health` },
    ],
    verification: "Re-run the safe check and confirm the HTTP status check passes.",
  },
  {
    key: "security_txt",
    title: "No Published security.txt",
    category: "disclosure",
    whyItMatters:
      "security.txt (RFC 9116) is the standard place to publish how a researcher should report a problem. Without it, someone who finds a real issue usually does not report it at all, so the fix never happens.",
    recommendedFix:
      "Publish /.well-known/security.txt with at least a Contact field, an Expires field and a preferred language. This is a low-risk, high-reputation change.",
    examples: [
      {
        stack: "next/public",
        snippet: `// public/.well-known/security.txt
Contact: mailto:security@example.dk
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en, da
Canonical: https://example.dk/.well-known/security.txt`,
      },
      {
        stack: "nginx",
        snippet: `location = /.well-known/security.txt {
    root /var/www/html;
    default_type text/plain;
}`,
      },
      {
        stack: "Spring Boot",
        snippet: `// src/main/resources/static/.well-known/security.txt
Contact: mailto:security@example.dk
Expires: 2027-01-01T00:00:00.000Z`,
      },
    ],
    verification: "Re-run the safe check and confirm the security.txt check returns HTTP 200.",
  },
  {
    key: "page_title",
    title: "Missing or Empty Page Title",
    category: "quality",
    whyItMatters:
      "This is not a vulnerability on its own. An empty title usually means a broken render path or a template that was never filled in, which is worth a look because that same path often has other problems.",
    recommendedFix:
      "Set a meaningful title per route. Treat this as a signal to inspect the render path, not as a security fix.",
    examples: [
      { stack: "Next.js", snippet: `export const metadata = { title: "Account — Example" };` },
      { stack: "nginx", snippet: `# This is an application concern, not a proxy concern.
# Render <title> in the view/template layer.` },
      { stack: "Spring Boot", snippet: `<title th:text="\${pageTitle}">Example</title>` },
    ],
    verification: "Re-run the safe check and confirm the page title check passes.",
  },
  {
    key: "viewport_meta",
    title: "Missing Viewport Meta Tag",
    category: "quality",
    whyItMatters:
      "Also not a vulnerability. It affects mobile rendering and accessibility. Zak Security records it because missing viewport tags usually correlate with an unmaintained frontend.",
    recommendedFix:
      "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the document head.",
    examples: [
      { stack: "Next.js", snippet: `export const viewport = { width: "device-width", initialScale: 1 };` },
      { stack: "nginx", snippet: `# Rendered by the application, not the proxy.` },
      { stack: "Spring Boot", snippet: `<meta name="viewport" content="width=device-width, initial-scale=1">` },
    ],
    verification: "Re-run the safe check and confirm the viewport check reports a match.",
  },
  {
    key: "copyright_year",
    title: "Stale Copyright Year",
    category: "quality",
    whyItMatters:
      "Not a security finding. A copyright year two or more years behind suggests the site is not actively maintained, which is a reasonable signal when deciding whether a review is worthwhile.",
    recommendedFix:
      "Make the year dynamic rather than hard-coded so it never goes stale again.",
    examples: [
      { stack: "Next.js", snippet: `const year = new Date().getFullYear();
<footer>&copy; {year} Example ApS</footer>` },
      { stack: "nginx", snippet: `# Rendered by the application, not the proxy.` },
      { stack: "Spring Boot", snippet: `<footer>&copy; <span th:text="\${#temporals.year(Temporal.now())}">2026</span></footer>` },
    ],
    verification: "Re-run the safe check and confirm the copyright check passes.",
  },
  {
    key: "advisory",
    title: "Known Exploited Vulnerability Affects Asset Technology",
    category: "dependency",
    whyItMatters:
      "A known exploited vulnerability is one that attackers are already using in the wild. Combined with a public proof of concept, the time between disclosure and exploitation is often days, not months. Patching is the control, and it is the only reliable one here.",
    recommendedFix:
      "Identify the exact installed version, then upgrade to the fixed release. If you cannot upgrade immediately, remove the affected code path or feature until you can.",
    examples: [
      {
        stack: "npm",
        snippet: `npm outdated
npm audit
npm install <package>@<fixed-version>`,
      },
      { stack: "Docker", snippet: `docker run --rm <image>:<fixed-tag> sh -c "<package> --version"
# rebuild the image from an updated base image` },
      { stack: "Verification", snippet: `curl -sS https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-XXXX-YYYY | head -c 400
# Passive, unauthenticated metadata lookup. No exploitation.` },
    ],
    verification:
      "Record the installed version, confirm it is at or above the fixed version, then mark the finding fixed and re-run the check.",
  },
  {
    key: "ai_agent_config",
    title: "AI Agent Configuration Risk",
    category: "ai_agent_config",
    whyItMatters:
      "An AI agent's real authority is its tool and permission list, not its system prompt. Configuration review catches the case where a helpful agent was given broad write or data permissions without a human in the loop, which turns any prompt-injection success into real damage.",
    recommendedFix:
      "Restore the human approval gate on write-capable tools, keep the tool list minimal, and split sensitive-data access away from outbound integrations.",
    examples: [
      {
        stack: "Configuration baseline",
        snippet: `tools:            [search_docs, read_ticket, draft_reply]   # read-only
permissions:      [docs.read, tickets.read]                      # no PII scope
external:         []                                            # no egress
humanApproval:    true
writeAccess:      false`,
      },
      {
        stack: "Higher risk posture",
        snippet: `tools:            [search_docs, update_ticket, send_email]  # write-capable
permissions:      [docs.read, tickets.write]
external:         [sendgrid]                                     # egress
humanApproval:    true            # required, or this is a HIGH finding
writeAccess:      true`,
      },
      {
        stack: "Verification",
        snippet: `# Configuration review only. Zak Security does not connect to
# or test the agent. Re-read the declared settings and confirm they
# match what you actually intended to expose.`,
      },
    ],
    verification:
      "Update the asset configuration in Zak Security and re-run the configuration review. No human approval on a write-capable agent should stop reporting as HIGH.",
  },
  {
    key: "mcp_config",
    title: "MCP Server Configuration Risk",
    category: "mcp_config",
    whyItMatters:
      "An MCP server is a capability broker: connected clients can call whatever it exposes, and they trust the tool descriptions it returns. An unauthenticated MCP server with write access is an open, documented control surface.",
    recommendedFix:
      "Require authentication, prefer read-only tools, and separate write operations behind a distinct server or tool so clients can be denied it independently.",
    examples: [
      {
        stack: "Preferred posture",
        snippet: `authentication:    true
writeAccess:      false
tools:            [list_resources, read_resource]
bound to:         localhost or private network`,
      },
      {
        stack: "Minimum bar when write access is required",
        snippet: `authentication:    true
writeAccess:      true
tools:            [read_resource, create_ticket]   # split tool names
approval:         explicit client confirmation for destructive calls
audit:            log every invocation with the calling client id`,
      },
      {
        stack: "Verification",
        snippet: `# Configuration review only. Confirm that an unauthenticated
# request to the server URL is rejected by design, using a request you
# own, against a server you are authorized to test.`,
      },
    ],
    verification:
      "Update the asset configuration and re-run the MCP review. The authentication finding should stop reporting as HIGH once authentication is enabled.",
  },
];

const SEVERITY_DEFAULT: Partial<Record<Severity, string>> = {
  INFO: "quality",
  LOW: "quality",
};

export function getTemplateForCategory(category: string): RemediationTemplate | null {
  return TEMPLATES.find((t) => t.category === category) ?? null;
}

export function getTemplateByKey(key: string): RemediationTemplate | null {
  return TEMPLATES.find((t) => t.key === key) ?? null;
}

export function allTemplates(): RemediationTemplate[] {
  return TEMPLATES;
}

export function categoryForSeverity(severity: Severity): string {
  return SEVERITY_DEFAULT[severity] ?? "quality";
}

export function fallbackTemplate(title: string, category: string): RemediationTemplate {
  return {
    key: "generic",
    title,
    category,
    whyItMatters:
      "This issue was detected by an automated configuration check. The reason it matters depends on how the affected component is used in your application, so confirm the impact in your own environment before treating the severity as final.",
    recommendedFix:
      "Reproduce the observation in a non-production environment, identify the component responsible, apply the narrowest fix that removes the behaviour, then re-run the check to confirm.",
    examples: [
      {
        stack: "Verification",
        snippet: `# Re-run the same safe check that produced this finding.
# A finding is only closed when the re-test no longer reproduces it.`,
      },
    ],
    verification: "Re-run the originating safe check and confirm the observation is no longer present.",
  };
}
