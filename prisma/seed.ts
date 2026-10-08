/**
 * Demo seed data.
 *
 * All companies and domains here are fictional and reserved for testing:
 *   example.dk / example.com / example.org are IANA reserved for documentation
 *   .test is an IANA reserved TLD that never resolves on the public internet
 *   "DemoFix ApS", "Nordic Demo Café" and "Example Security Lab" are invented.
 *
 * Every record is tagged dataMode = DEMO so the UI can label it.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Resetting demo data…");
  await prisma.activityLog.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.checkRun.deleteMany();
  await prisma.authorization.deleteMany();
  await prisma.remediation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.threatAdvisory.deleteMany();
  await prisma.securityLead.deleteMany();

  console.log("Creating assets…");

  const website = await prisma.asset.create({
    data: {
      name: "example.dk",
      type: "WEBSITE",
      url: "https://example.dk",
      owner: "Zak Security (client: DemoFix ApS)",
      status: "ACTIVE",
      authorizationStatus: "ACTIVE",
      importance: "HIGH",
      technologies: "nextjs,nginx,react",
      version: "14.2.3",
      notes:
        "Marketing site for the demo client. Scope is limited to the public site. No login testing in scope.",
      lastChecked: daysFromNow(-1),
      dataMode: "DEMO",
    },
  });

  const repo = await prisma.asset.create({
    data: {
      name: "DemoFix Demo-Web (GitHub)",
      type: "GITHUB_REPO",
      url: "https://github.com/example-org/demo-web",
      owner: "DemoFix ApS",
      status: "ACTIVE",
      authorizationStatus: "NOT_AUTHORIZED",
      importance: "MEDIUM",
      technologies: "nextjs,react,typescript,next-auth",
      version: "14.2.3",
      notes:
        "Repository observed for dependency advisories only. Zak Security holds no GitHub token and performs no code execution.",
      dataMode: "DEMO",
    },
  });

  const mcp = await prisma.asset.create({
    data: {
      name: "Local MCP Server (demo)",
      type: "MCP_SERVER",
      url: "http://127.0.0.1:8931/mcp",
      owner: "Zak Security internal",
      status: "ACTIVE",
      authorizationStatus: "ACTIVE",
      importance: "MEDIUM",
      technologies: "mcp,typescript",
      notes:
        "Configuration review only. Zak Security never connects to or invokes tools on an MCP server.",
      mcpServerUrl: "http://127.0.0.1:8931/mcp",
      mcpAuthenticationEnabled: false,
      mcpToolsExposed: "list_resources, read_resource, write_note",
      mcpWriteAccess: true,
      dataMode: "DEMO",
    },
  });

  const agent = await prisma.asset.create({
    data: {
      name: "DemoFix Support Assistant (AI agent)",
      type: "AI_AGENT",
      url: "",
      owner: "DemoFix ApS",
      status: "ACTIVE",
      authorizationStatus: "NOT_AUTHORIZED",
      importance: "HIGH",
      technologies: "openai,langchain",
      notes:
        "Configuration review of declared tool and permission surface. No prompt injection testing is performed by Zak Security.",
      aiTools: "search_docs, read_ticket, draft_reply, send_email",
      aiPermissions: "docs.read, tickets.read, tickets.write, customer.pii",
      aiExternalIntegrations: "sendgrid,openai",
      aiHumanApprovalRequired: false,
      aiSensitiveDataAccess: true,
      dataMode: "DEMO",
    },
  });

  console.log("Creating authorizations…");

  const auth1 = await prisma.authorization.create({
    data: {
      assetId: website.id,
      authorizedBy: "DemoFix ApS — Head of Engineering (signed SOW-2026-014)",
      scope:
        "Passive HTTP header inspection and public page analysis of example.dk only. No login testing, no port scanning, no fuzzing, no load testing.",
      startDate: daysFromNow(-30),
      endDate: daysFromNow(3),
      allowedChecks: "PASSIVE_WEB,SAFE_HTTP",
      notes: "Written authorization required by scope. Expires in 3 days, renewal not yet signed.",
      status: "ACTIVE",
      dataMode: "DEMO",
    },
  });

  const auth2 = await prisma.authorization.create({
    data: {
      assetId: mcp.id,
      authorizedBy: "Zak Security internal owner",
      scope:
        "Static configuration review of the locally declared MCP server settings. No requests are sent to the server.",
      startDate: daysFromNow(-10),
      endDate: daysFromNow(-1),
      allowedChecks: "MCP_REVIEW",
      notes: "Lapsed one day ago. Configuration review still runs, but no other check is permitted.",
      status: "EXPIRED",
      dataMode: "DEMO",
    },
  });

  console.log("Creating findings…");

  const f1 = await prisma.finding.create({
    data: {
      title: "Missing HSTS Header",
      assetId: website.id,
      category: "transport_security",
      severity: "MEDIUM",
      status: "OPEN",
      description:
        "The site is served over HTTPS but does not send Strict-Transport-Security, so the browser is not instructed to refuse plain HTTP on later visits.",
      evidence: `strict-transport-security header not returned.

Source: https://example.dk
Checked: ${new Date().toISOString().slice(0, 10)}
Method: non-intrusive HTTP header inspection (one GET request, redirects followed manually up to 3 hops).`,
      source: "https://example.dk",
      evidenceData: JSON.stringify(
        {
          checkId: "HSTS_HEADER",
          verdict: "FAIL",
          observedHeaders: {
            server: "nginx",
            "x-powered-by": "Next.js",
            "content-type": "text/html; charset=utf-8",
          },
          note: "strict-transport-security absent from the response header set",
        },
        null,
        2,
      ),
      detectedAt: daysFromNow(-9),
      remediation: "Add the missing header, then re-run the safe header check.",
      sourceType: "PASSIVE_CHECK",
      fingerprint: "PASSIVE_WEB:HSTS_HEADER",
      dataMode: "DEMO",
    },
  });

  const f2 = await prisma.finding.create({
    data: {
      title: "Missing Content-Security-Policy Header",
      assetId: website.id,
      category: "xss_defense",
      severity: "LOW",
      status: "IN_PROGRESS",
      description:
        "No Content-Security-Policy or Content-Security-Policy-Report-Only header is returned, so injected markup would have no browser-enforced restriction.",
      evidence: `content-security-policy header not returned.

Source: https://example.dk
Checked: ${new Date().toISOString().slice(0, 10)}
Method: non-intrusive HTTP header inspection.`,
      source: "https://example.dk",
      evidenceData: JSON.stringify({ checkId: "CSP_HEADER", verdict: "WARN" }, null, 2),
      detectedAt: daysFromNow(-9),
      remediation: "Add the missing browser hardening header, then re-run the safe header check.",
      sourceType: "PASSIVE_CHECK",
      fingerprint: "PASSIVE_WEB:CSP_HEADER",
      dataMode: "DEMO",
    },
  });

  const f3 = await prisma.finding.create({
    data: {
      title: "Dependency advisory may affect declared Next.js version",
      assetId: repo.id,
      category: "dependency",
      severity: "HIGH",
      status: "OPEN",
      description:
        "The repository declares Next.js 14.2.3. A known exploited advisory affects a version range that includes that series. This is a potential match, not a confirmed vulnerable installation, because the resolved lockfile version has not been verified.",
      evidence: `Asset "DemoFix Demo-Web (GitHub)" declares version 14.2.3 in Zak Security.
Advisory GHSA-DEMO-0001 affects "Next.js < 14.2.6" and is listed as known exploited.

Source: https://github.com/example-org/demo-web (declared, not fetched)
Checked: ${new Date().toISOString().slice(0, 10)}
Method: technology/version tag matching against the threat intel table. No repository was cloned and no code was executed.`,
      source: "Threat Intel (demo data)",
      evidenceData: JSON.stringify(
        { matchType: "DECLARED_VERSION_RANGE", confidence: "POTENTIAL", requiresLockfileVerification: true },
        null,
        2,
      ),
      detectedAt: daysFromNow(-2),
      remediation: "Confirm the resolved version in the lockfile, then upgrade to 14.2.6 or later.",
      sourceType: "DEPENDENCY_INTEL",
      fingerprint: "DEPENDENCY:GHSA-DEMO-0001",
      dataMode: "DEMO",
    },
  });

  const f4 = await prisma.finding.create({
    data: {
      title: "MCP server has no authentication configured",
      assetId: mcp.id,
      category: "mcp_config",
      severity: "HIGH",
      status: "OPEN",
      description:
        "The MCP server declares mcpAuthenticationEnabled = false, so any client that can reach the endpoint can list and invoke its tools. The server also exposes write access.",
      evidence: `Configuration review of MCP server asset "Local MCP Server (demo)" at http://127.0.0.1:8931/mcp, human-declared settings.
mcpAuthenticationEnabled = false. mcpWriteAccess = true. Tools declared: list_resources, read_resource, write_note.

Source: ${mcp.name} declared configuration
Checked: ${new Date().toISOString().slice(0, 10)}
Method: static configuration review. No requests were sent to the MCP server.`,
      source: `${mcp.name} declared configuration`,
      evidenceData: JSON.stringify(
        { check: "mcp_config", mcpAuthenticationEnabled: false, mcpWriteAccess: true },
        null,
        2,
      ),
      detectedAt: daysFromNow(-4),
      remediation:
        "Enable authentication on the MCP server. Bind to localhost or a private network as an interim measure, and require a token or mTLS on every connection.",
      sourceType: "MCP_REVIEW",
      fingerprint: "MCP_REVIEW:MCP server has no authentication configured",
      dataMode: "DEMO",
    },
  });

  const f5 = await prisma.finding.create({
    data: {
      title: "AI agent has write-capable tools with no human approval gate",
      assetId: agent.id,
      category: "ai_agent_config",
      severity: "HIGH",
      status: "OPEN",
      description:
        "The agent declares send_email and ticket-write permissions with humanApprovalRequired = false, and it holds customer.pii while integrating with external services.",
      evidence: `Configuration review of asset "${agent.name}" (AI_AGENT), human-declared settings.
Write-capable tools: send_email. aiHumanApprovalRequired = false. Sensitive permissions: customer.pii. External integrations: sendgrid, openai.

Source: ${agent.name} declared configuration
Checked: ${new Date().toISOString().slice(0, 10)}
Method: static configuration review. No requests were sent to the agent.`,
      source: `${agent.name} declared configuration`,
      evidenceData: JSON.stringify(
        { check: "ai_agent_config", aiHumanApprovalRequired: false, sensitivePermissions: ["customer.pii"] },
        null,
        2,
      ),
      detectedAt: daysFromNow(-5),
      remediation: "Set humanApprovalRequired = true so every write tool call is confirmed by a human before execution.",
      sourceType: "AI_AGENT_REVIEW",
      fingerprint: "AI_AGENT_REVIEW:AI agent has write-capable tools with no human approval gate",
      dataMode: "DEMO",
    },
  });

  // One finding that has already been fixed, so "Recently Fixed" is not empty.
  const f6 = await prisma.finding.create({
    data: {
      title: "Missing X-Content-Type-Options Header",
      assetId: website.id,
      category: "xss_defense",
      severity: "MEDIUM",
      status: "FIXED",
      description:
        "The site previously did not send X-Content-Type-Options. The client deployed the header and a re-test confirmed it is present.",
      evidence: `x-content-type-options: nosniff

Source: https://example.dk
Checked: ${new Date().toISOString().slice(0, 10)}
Method: non-intrusive HTTP header inspection. Confirmed present on re-test.`,
      source: "https://example.dk",
      evidenceData: JSON.stringify({ checkId: "X_CONTENT_TYPE_OPTIONS", verdict: "PASS", verifiedAt: "re-test" }, null, 2),
      detectedAt: daysFromNow(-20),
      verifiedAt: daysFromNow(-2),
      reverifiedAt: daysFromNow(-2),
      remediation: "Send X-Content-Type-Options: nosniff on every response.",
      sourceType: "PASSIVE_CHECK",
      fingerprint: "PASSIVE_WEB:X_CONTENT_TYPE_OPTIONS",
      dataMode: "DEMO",
    },
  });

  console.log("Creating threat advisories…");

  await prisma.threatAdvisory.createMany({
    data: [
      {
        advisoryId: "GHSA-DEMO-0001",
        cve: "CVE-2026-10001",
        title: "DEMO: Server-side request handling flaw in Next.js image optimization",
        affectedTechnology: "Next.js",
        affectedVersions: "< 14.2.6",
        fixedVersion: "14.2.6",
        severity: "HIGH",
        knownExploited: true,
        patchAvailable: true,
        publishedAt: daysFromNow(-45),
        description:
          "SAMPLE DATA for prototype demonstration. A crafted request to the image optimization route can cause the server to fetch an internal address. Listed here to show how known-exploited status affects priority, not as a real advisory.",
        referenceUrl: "https://github.com/example-org/demo-web/security/advisories/DEMO-0001",
        feed: "GHSA",
        dataMode: "DEMO",
      },
      {
        advisoryId: "CISA-KEV-DEMO-2026-0042",
        cve: "CVE-2026-20042",
        title: "DEMO: nginx resolver off-by-one leads to out-of-bounds read",
        affectedTechnology: "nginx",
        affectedVersions: "1.24.0 – 1.26.4",
        fixedVersion: "1.26.5",
        severity: "CRITICAL",
        knownExploited: true,
        patchAvailable: true,
        publishedAt: daysFromNow(-30),
        description:
          "SAMPLE DATA for prototype demonstration. Shows a critical known-exploited advisory against a technology tag used by a demo asset. Not a real CVE.",
        referenceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        feed: "CISA_KEV",
        dataMode: "DEMO",
      },
      {
        advisoryId: "GHSA-DEMO-0007",
        cve: "CVE-2026-30007",
        title: "DEMO: next-auth session fixation on cross-site callback",
        affectedTechnology: "next-auth",
        affectedVersions: "< 4.24.2",
        fixedVersion: "4.24.2",
        severity: "MEDIUM",
        knownExploited: false,
        patchAvailable: true,
        publishedAt: daysFromNow(-12),
        description:
          "SAMPLE DATA for prototype demonstration. Not known exploited, so it ranks below the KEV entries even though it affects a declared asset technology.",
        referenceUrl: "https://github.com/example-org/demo-web/security/advisories/DEMO-0007",
        feed: "GHSA",
        dataMode: "DEMO",
      },
    ],
  });

  console.log("Creating security leads…");

  await prisma.securityLead.createMany({
    data: [
      {
        company: "Nordic Demo Café",
        website: "https://nordic-demo-cafe.test",
        industry: "Hospitality",
        location: "Aarhus, DK",
        observedIssue:
          "Public site returns no security.txt and no Referrer-Policy header. Observed as a potential security configuration improvement for the owner to consider.",
        serviceOpportunity:
          "Small fixed-scope hardening review: add security.txt, referrer-policy and a CSP report-only policy, plus a short handover note.",
        status: "NEW",
        sourceUrl: "https://nordic-demo-cafe.test",
        notes:
          "DEMO LEAD. Fictional company, .test TLD. Observation came from one passive header check of the public homepage.",
        dataMode: "DEMO",
      },
      {
        company: "DemoFix ApS",
        website: "https://demofix.example.dk",
        industry: "Software / B2B services",
        location: "Odense, DK",
        observedIssue:
          "Public marketing site does not enforce HTTPS with HSTS. Phrased as an opportunity: the owner may want a baseline security review once their own project ends.",
        serviceOpportunity:
          "Proposal for a recurring quarterly passive security posture review plus a signed authorization each quarter.",
        status: "QUALIFIED",
        sourceUrl: "https://demofix.example.dk",
        notes: "DEMO LEAD. Fictional company, reserved example.dk domain.",
        dataMode: "DEMO",
      },
      {
        company: "Example Security Lab",
        website: "https://example-security-lab.example.org",
        industry: "Education / training",
        location: "Remote, EU",
        observedIssue:
          "No published security contact. Documented academic examples of a missing security.txt, which means researchers have no documented way to report an issue.",
        serviceOpportunity:
          "Low-effort engagement: help publish an RFC 9116 security.txt and a basic disclosure page, delivered as a fixed-price task.",
        status: "RESEARCHING",
        sourceUrl: "https://example-security-lab.example.org",
        notes: "DEMO LEAD. Fictional company, reserved example.org domain.",
        dataMode: "DEMO",
      },
    ],
  });

  console.log("Creating remediation records and activity log…");

  await prisma.remediation.create({
    data: {
      id: f1.id,
      title: "Missing HSTS Header",
      category: "transport_security",
      whyItMatters:
        "Strict-Transport-Security tells browsers to reach the site over HTTPS only for a fixed period. Without it, a user on an untrusted network can be downgraded to plain HTTP on the very first request, which exposes session cookies and page content to anyone in the middle. The downgrade attack is the reason HSTS matters more than the HTTPS itself.",
      fix: "Add a Strict-Transport-Security header with a long max-age, enable includeSubDomains once you are sure every subdomain is HTTPS-only, and optionally add preload. Start at six months before you submit a domain to the preload list, because preload is hard to undo.",
      examples: JSON.stringify([
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
};`,
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

// WebSecurityConfig.java
http.headers(headers -> headers
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true)
        .preload(true)
        .maxAgeInSeconds(63072000))
);`,
        },
      ]),
      verification: "Re-run the safe header check on the asset. Strict-Transport-Security should be reported as present, and the finding should close as fixed.",
      generatedBy: "TEMPLATES",
      dataMode: "DEMO",
    },
  });

  const activity: {
    action: string;
    entity: string;
    entityId: string | null;
    assetId: string | null;
    summary: string;
  }[] = [
    { action: "asset.created", entity: "Asset", entityId: website.id, assetId: website.id, summary: `Asset "${website.name}" (WEBSITE) added, owned by ${website.owner}. Not authorized yet.` },
    { action: "asset.created", entity: "Asset", entityId: repo.id, assetId: repo.id, summary: `Asset "${repo.name}" (GITHUB_REPO) added, owned by ${repo.owner}. Not authorized yet.` },
    { action: "asset.created", entity: "Asset", entityId: mcp.id, assetId: mcp.id, summary: `Asset "${mcp.name}" (MCP_SERVER) added, owned by ${mcp.owner}. Not authorized yet.` },
    { action: "asset.created", entity: "Asset", entityId: agent.id, assetId: agent.id, summary: `Asset "${agent.name}" (AI_AGENT) added, owned by ${agent.owner}. Not authorized yet.` },
    { action: "authorization.created", entity: "Authorization", entityId: auth1.id, assetId: website.id, summary: `Authorization recorded for example.dk, authorized by DemoFix ApS — Head of Engineering (signed SOW-2026-014), valid 30 days.` },
    { action: "authorization.created", entity: "Authorization", entityId: auth2.id, assetId: mcp.id, summary: `Authorization recorded for the local MCP server, valid 10 days.` },
    { action: "check.executed", entity: "CheckRun", entityId: null, assetId: website.id, summary: "Safe passive check on example.dk: 4 passed, 2 failed, 3 warnings. 3 findings raised." },
    { action: "finding.created", entity: "Finding", entityId: f1.id, assetId: website.id, summary: "Finding raised on example.dk: Missing HSTS Header." },
    { action: "finding.created", entity: "Finding", entityId: f2.id, assetId: website.id, summary: "Finding raised on example.dk: Missing Content-Security-Policy Header." },
    { action: "finding.created", entity: "Finding", entityId: f3.id, assetId: repo.id, summary: "Dependency advisory matched against DemoFix Demo-Web (GitHub): GHSA-DEMO-0001." },
    { action: "finding.created", entity: "Finding", entityId: f4.id, assetId: mcp.id, summary: "Configuration review raised on the local MCP server: no authentication, write access declared." },
    { action: "finding.created", entity: "Finding", entityId: f5.id, assetId: agent.id, summary: "Configuration review raised on the DemoFix Support Assistant: write tools with no human approval gate." },
    { action: "finding.fixed", entity: "Finding", entityId: f6.id, assetId: website.id, summary: '"Missing X-Content-Type-Options Header" moved to fixed.' },
    { action: "finding.reverified", entity: "Finding", entityId: f6.id, assetId: website.id, summary: 'Re-test on example.dk confirmed the fix for "Missing X-Content-Type-Options Header".' },
    { action: "remediation.generated", entity: "Remediation", entityId: f1.id, assetId: website.id, summary: 'Remediation generated for "Missing HSTS Header" using built-in templates.' },
  ];

  const sorted = activity
    .map((a, i) => ({ ...a, offsetHours: i * 3 + 1 }))
    .sort((a, b) => b.offsetHours - a.offsetHours);

  for (const a of sorted) {
    await prisma.activityLog.create({
      data: {
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        assetId: a.assetId,
        summary: a.summary,
        details: "",
        dataMode: "DEMO",
        createdAt: new Date(Date.now() - a.offsetHours * 3_600_000),
      },
    });
  }

  const counts = {
    assets: await prisma.asset.count(),
    authorizations: await prisma.authorization.count(),
    findings: await prisma.finding.count(),
    advisories: await prisma.threatAdvisory.count(),
    leads: await prisma.securityLead.count(),
    activity: await prisma.activityLog.count(),
  };

  console.log("\nDemo data seeded:", counts);
  console.log("All records are fictional and tagged dataMode = DEMO.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
