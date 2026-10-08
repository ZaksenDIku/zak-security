import "server-only";
import { prisma } from "@/lib/prisma";
import { computePriority } from "@/lib/priority";
import { daysBetween, timeAgo } from "@/lib/format";
import type { Severity } from "@/lib/constants";

export const OPEN_STATUSES = ["OPEN", "IN_PROGRESS"] as const;

/** Authorization status is derived, never trusted from a stale column. */
export function deriveAuthStatus(auth: { startDate: Date; endDate: Date } | null): "ACTIVE" | "EXPIRED" | "NOT_AUTHORIZED" {
  if (!auth) return "NOT_AUTHORIZED";
  const now = new Date();
  if (auth.startDate <= now && auth.endDate >= now) return "ACTIVE";
  if (auth.endDate < now) return "EXPIRED";
  return "NOT_AUTHORIZED";
}

export async function getAssetsWithAuth() {
  const assets = await prisma.asset.findMany({
    include: {
      authorizations: { orderBy: { endDate: "desc" } },
      _count: { select: { findings: true } },
    },
    orderBy: { name: "asc" },
  });
  return assets.map((a) => {
    const auth = a.authorizations[0] ?? null;
    return {
      ...a,
      derivedAuthStatus: deriveAuthStatus(auth),
      latestAuth: auth,
      openFindings: 0,
    };
  });
}

export async function getOverview() {
  const now = new Date();

  const [
    assets,
    allFindings,
    advisories,
    leads,
    activity,
    authorizations,
    recentlyFixed,
  ] = await Promise.all([
    prisma.asset.findMany({ include: { authorizations: { orderBy: { endDate: "desc" } } } }),
    prisma.finding.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      include: { asset: true },
    }),
    prisma.threatAdvisory.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.securityLead.findMany(),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.authorization.findMany({ include: { asset: true } }),
    prisma.finding.findMany({
      where: { status: "FIXED" },
      include: { asset: true },
      orderBy: { verifiedAt: "desc" },
      take: 5,
    }),
  ]);

  const authByAsset = new Map(assets.map((a) => [a.id, a.authorizations[0] ?? null]));

  const kevIds = advisories.filter((a) => a.knownExploited).map((a) => a.advisoryId);

  const enriched = allFindings.map((f) => {
    const auth = authByAsset.get(f.assetId) ?? null;
    return {
      ...f,
      priority: computePriority({
        severity: f.severity as Severity,
        status: f.status,
        importance: f.asset.importance,
        detectedAt: f.detectedAt,
        authorizationActive: deriveAuthStatus(auth) === "ACTIVE",
        authorizationEndDate: auth?.endDate ?? null,
        assetType: f.asset.type,
        knownExploited: kevIds.some((id) => f.fingerprint.includes(id)),
      }),
    };
  });

  const critical = allFindings.filter((f) => f.severity === "CRITICAL").length;
  const high = allFindings.filter((f) => f.severity === "HIGH").length;
  const notAuthorized = assets.filter((a) => deriveAuthStatus(authByAsset.get(a.id) ?? null) !== "ACTIVE").length;
  const newAdvisories = advisories.filter((a) => daysBetween(a.publishedAt) <= 30).length;
  const knownExploited = advisories.filter((a) => a.knownExploited).length;

  const expiring = authorizations
    .filter((a) => a.status === "ACTIVE" && a.endDate >= now)
    .map((a) => ({ ...a, daysLeft: daysBetween(a.endDate, now) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const staleAssets = assets
    .filter((a) => !a.lastChecked || daysBetween(a.lastChecked) > 14)
    .map((a) => ({ ...a, daysSince: a.lastChecked ? daysBetween(a.lastChecked) : null }));

  // ---- Needs attention: top 3 items, each a plain explanation. ----
  type Attention = {
    key: string;
    rank: number;
    headline: string;
    detail: string;
    href: string;
    cta: string;
    tone: "critical" | "warn" | "info";
  };
  const attention: Attention[] = [];

  const kev = advisories.filter((a) => a.knownExploited);
  const kevAssets = assets.filter((a) =>
    a.technologies
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .some((tech) => tech.length > 0 && kev.some((k) => k.affectedTechnology.toLowerCase().includes(tech)))
  );
  if (kev.length > 0) {
    attention.push({
      key: "kev",
      rank: 1,
      headline: `${kev.length} known exploited ${kev.length === 1 ? "advisory" : "advisories"} in the intel feed`,
      detail:
        kevAssets.length > 0
          ? `${kevAssets.length} asset${kevAssets.length === 1 ? "" : "s"} declare a technology that appears in the affected range. Potential match, version not yet verified.`
          : `No asset currently declares a matching technology. Feed is ${kev[0].advisoryId}.`,
      href: "/threat-intel",
      cta: "Review threat intel",
      tone: "critical",
    });
  }

  const criticalFindings = enriched
    .filter((f) => f.priority.tier === "CRITICAL" || f.severity === "HIGH")
    .sort((a, b) => (a.priority.tier === "CRITICAL" ? -1 : 1));

  if (criticalFindings.length > 0) {
    const f = criticalFindings[0];
    attention.push({
      key: "finding",
      rank: 2,
      headline: `${f.severity} finding on ${f.asset.name}: ${f.title}`,
      detail: f.priority.reasons[0] ?? "",
      href: `/findings/${f.id}`,
      cta: "Open finding",
      tone: f.severity === "CRITICAL" ? "critical" : "warn",
    });
  } else if (high > 0) {
    attention.push({
      key: "finding",
      rank: 2,
      headline: `${high} high severity finding${high === 1 ? "" : "s"} open`,
      detail: "Open Findings to work through them in priority order.",
      href: "/findings",
      cta: "Open findings",
      tone: "warn",
    });
  }

  const soon = expiring.filter((e) => e.daysLeft <= 14);
  if (soon.length > 0) {
    const a = soon[0];
    attention.push({
      key: "expiry",
      rank: 3,
      headline: `Authorization for ${a.asset.name} expires ${a.daysLeft === 0 ? "today" : `in ${a.daysLeft} days`}`,
      detail: `Authorized by ${a.authorizedBy}. No checks are permitted after this date until the scope is renewed.`,
      href: "/authorizations",
      cta: "Review authorizations",
      tone: a.daysLeft <= 3 ? "critical" : "warn",
    });
  } else if (staleAssets.length > 0) {
    attention.push({
      key: "stale",
      rank: 3,
      headline: `${staleAssets.length} asset${staleAssets.length === 1 ? "" : "s"} not checked in over 14 days`,
      detail: "Run a passive check to refresh the evidence before the overview goes stale.",
      href: "/assets",
      cta: "Open assets",
      tone: "info",
    });
  }

  return {
    stats: {
      assets: assets.length,
      authorizedAssets: assets.filter((a) => deriveAuthStatus(authByAsset.get(a.id) ?? null) === "ACTIVE").length,
      notAuthorized,
      openFindings: allFindings.length,
      critical,
      high,
      recentlyFixed: recentlyFixed.length,
      newAdvisories,
      knownExploited,
      advisories: advisories.length,
      leads: leads.length,
      newLeads: leads.filter((l) => l.status === "NEW").length,
      demoRecords:
        (await prisma.asset.count({ where: { dataMode: "DEMO" } })) +
        (await prisma.finding.count({ where: { dataMode: "DEMO" } })) +
        (await prisma.threatAdvisory.count({ where: { dataMode: "DEMO" } })) +
        (await prisma.securityLead.count({ where: { dataMode: "DEMO" } })),
    },
    attention: attention.slice(0, 3),
    priorityQueue: enriched
      .sort((a, b) => a.priority.tier.localeCompare(b.priority.tier))
      .slice(0, 5),
    activity: activity.map((a) => ({ ...a, ago: timeAgo(a.createdAt) })),
    recentlyFixed: recentlyFixed.map((f) => ({ ...f, ago: timeAgo(f.verifiedAt ?? f.updatedAt) })),
    expiring,
    staleAssets,
    hasDemo:
      (await prisma.asset.count({ where: { dataMode: "DEMO" } })) > 0 ||
      (await prisma.finding.count({ where: { dataMode: "DEMO" } })) > 0,
  };
}

export async function getFindingsForList() {
  const findings = await prisma.finding.findMany({
    include: { asset: { include: { authorizations: { orderBy: { endDate: "desc" }, take: 1 } } } },
    orderBy: [{ status: "asc" }, { detectedAt: "desc" }],
  });

  const advisories = await prisma.threatAdvisory.findMany();

  const kevIds = advisories.filter((a) => a.knownExploited).map((a) => a.advisoryId);

  return findings.map((f) => {
    const auth = f.asset.authorizations[0] ?? null;
    return {
      ...f,
      asset: { ...f.asset, derivedAuthStatus: deriveAuthStatus(auth), authEndDate: auth?.endDate ?? null },
      priority: computePriority({
        severity: f.severity as Severity,
        status: f.status,
        importance: f.asset.importance,
        detectedAt: f.detectedAt,
        authorizationActive: deriveAuthStatus(auth) === "ACTIVE",
        authorizationEndDate: auth?.endDate ?? null,
        assetType: f.asset.type,
        knownExploited: kevIds.some((id) => f.fingerprint.includes(id)),
      }),
    };
  });
}

export interface IntelMatch {
  advisory: {
    id: string;
    advisoryId: string;
    cve: string | null;
    title: string;
    affectedTechnology: string;
    affectedVersions: string;
    fixedVersion: string | null;
    severity: Severity;
    knownExploited: boolean;
    patchAvailable: boolean;
    publishedAt: Date;
    description: string;
    referenceUrl: string;
    feed: string;
    dataMode: "REAL" | "DEMO";
  };
  assets: {
    id: string;
    name: string;
    type: string;
    version: string | null;
    technologies: string;
    verdict: "POTENTIAL_MATCH" | "TECHNOLOGY_ONLY" | "NO_MATCH";
    explanation: string;
  }[];
}

/**
 * Technology/version matching for threat intel.
 *
 * Deliberately conservative. Zak Security reports a POTENTIAL_MATCH only when
 * the asset's DECLARED version string falls inside the advisory's declared
 * affected range. Anything else is a weaker signal and is labelled as such.
 * It never claims a confirmed vulnerable installation.
 */
export function compareVersion(declared: string, affected: string): boolean | null {
  const parse = (v: string) => v.match(/\d+/g)?.map(Number) ?? null;
  const a = parse(declared);
  if (!a) return null;

  const range = affected.trim();
  const lessThan = /^<\s*(\d[\d.]*)/.exec(range);
  if (lessThan) {
    const b = parse(lessThan[1]);
    if (!b) return null;
    return compareArrays(a, b) < 0;
  }
  const rangeMatch = /^(\d[\d.]*)\s*[–\-~]\s*(\d[\d.]*)/.exec(range);
  if (rangeMatch) {
    const lo = parse(rangeMatch[1]);
    const hi = parse(rangeMatch[2]);
    if (!lo || !hi) return null;
    return compareArrays(a, lo) >= 0 && compareArrays(a, hi) <= 0;
  }
  const lte = /^<=\s*(\d[\d.]*)/.exec(range);
  if (lte) {
    const b = parse(lte[1]);
    return b ? compareArrays(a, b) <= 0 : null;
  }
  return null;
}

function compareArrays(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export async function getThreatIntel(): Promise<IntelMatch[]> {
  const [advisories, assets] = await Promise.all([
    prisma.threatAdvisory.findMany({ orderBy: [{ knownExploited: "desc" }, { publishedAt: "desc" }] }),
    prisma.asset.findMany(),
  ]);

  return advisories.map((advisory) => ({
    advisory: {
      id: advisory.id,
      advisoryId: advisory.advisoryId,
      cve: advisory.cve,
      title: advisory.title,
      affectedTechnology: advisory.affectedTechnology,
      affectedVersions: advisory.affectedVersions,
      fixedVersion: advisory.fixedVersion,
      severity: advisory.severity as Severity,
      knownExploited: advisory.knownExploited,
      patchAvailable: advisory.patchAvailable,
      publishedAt: advisory.publishedAt,
      description: advisory.description,
      referenceUrl: advisory.referenceUrl,
      feed: advisory.feed,
      dataMode: advisory.dataMode,
    },
    assets: assets
      .map((asset) => {
        const techs = asset.technologies
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

        const techMatches = techs.some((t) => {
          const target = advisory.affectedTechnology.toLowerCase();
          return t === target || t.includes(target) || target.includes(t);
        });

        if (!techMatches) {
          return {
            id: asset.id,
            name: asset.name,
            type: asset.type,
            version: asset.version,
            technologies: asset.technologies,
            verdict: "NO_MATCH" as const,
            explanation: "",
          };
        }

        if (asset.version) {
          const inRange = compareVersion(asset.version, advisory.affectedVersions);
          if (inRange === true) {
            return {
              id: asset.id,
              name: asset.name,
              type: asset.type,
              version: asset.version,
              technologies: asset.technologies,
              verdict: "POTENTIAL_MATCH" as const,
              explanation: `Declares ${asset.technologies} at ${asset.version}, which falls inside the declared affected range "${advisory.affectedVersions}". This is a potential match based on a declared version, not a verified installed version.`,
            };
          }
          if (inRange === false) {
            return {
              id: asset.id,
              name: asset.name,
              type: asset.type,
              version: asset.version,
              technologies: asset.technologies,
              verdict: "NO_MATCH" as const,
              explanation: `Declares ${asset.version}, which is outside the affected range "${advisory.affectedVersions}".`,
            };
          }
        }

        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          version: asset.version,
          technologies: asset.technologies,
          verdict: "TECHNOLOGY_ONLY" as const,
          explanation: asset.version
            ? `Uses ${advisory.affectedTechnology} at ${asset.version}, but the affected range "${advisory.affectedVersions}" could not be compared automatically. Verify the installed version.`
            : `Uses ${advisory.affectedTechnology} but no version is declared, so no version comparison is possible.`,
        };
      })
      .filter((a) => a.verdict !== "NO_MATCH"),
  }));
}

const LEARNING_TOPICS = [
  "OWASP Top 10 — Security Misconfiguration",
  "Strict-Transport-Security in depth, and when not to use preload",
  "Content-Security-Policy report-only rollout without breaking production",
  "RFC 9116 security.txt, and why the Contact field matters most",
  "Known Exploited Vulnerabilities: what changes when you patch on a KEV clock",
  "MCP server authentication and the tool description trust problem",
  "AI agent permission scoping: separating sensitive data access from egress",
  "Clickjacking defence: CSP frame-ancestors versus X-Frame-Options",
  "Referrer-Policy and what actually leaks in the default configuration",
  "Passive-only monitoring: designing checks that cannot become active testing",
];

export async function getBriefing() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [assets, findings, advisories, authorizations, fixedRecently, checkRuns, leads] = await Promise.all([
    prisma.asset.findMany({ include: { authorizations: { orderBy: { endDate: "desc" }, take: 1 } } }),
    prisma.finding.findMany({ include: { asset: true }, orderBy: { detectedAt: "desc" } }),
    prisma.threatAdvisory.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.authorization.findMany({ include: { asset: true } }),
    prisma.finding.findMany({
      where: { status: "FIXED", verifiedAt: { gte: startOfToday } },
      include: { asset: true },
    }),
    prisma.checkRun.findMany({ orderBy: { startedAt: "desc" }, take: 10, include: { asset: true } }),
    prisma.securityLead.findMany(),
  ]);

  const newFindings = findings.filter((f) => f.detectedAt >= startOfToday);
  const newAdvisories = advisories.filter((a) => a.publishedAt >= startOfToday);
  const newChecks = checkRuns.filter((c) => c.startedAt >= startOfToday);

  const expiring = authorizations
    .filter((a) => a.status === "ACTIVE" && a.endDate >= now && daysBetween(a.endDate, now) <= 30)
    .map((a) => ({ ...a, daysLeft: daysBetween(a.endDate, now) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const needsReview = assets
    .filter((a) => !a.lastChecked || daysBetween(a.lastChecked) > 14)
    .map((a) => ({ ...a, daysSince: a.lastChecked ? daysBetween(a.lastChecked) : null }));

  type Line = { text: string; why: string; href?: string; cta?: string; tone: "critical" | "warn" | "info" | "good" };
  const focus: Line[] = [];

  const kevMatches = getSimpleKevMatches(assets, advisories);
  for (const m of kevMatches.slice(0, 2)) {
    focus.push({
      text: `Review ${m.advisory.advisoryId} against ${m.assetName} (${m.advisory.affectedTechnology})`,
      why: `Known exploited advisory affecting the declared range ${m.advisory.affectedVersions}. ${m.assetName} declares version ${m.assetVersion}. Version match is based on a declared value, not a verified install.`,
      href: "/threat-intel",
      cta: "Open threat intel",
      tone: "critical",
    });
  }

  for (const f of fixedRecently.slice(0, 3)) {
    focus.push({
      text: `Confirmed fixed: ${f.title} on ${f.asset.name}`,
      why: "A re-test no longer reproduces this observation, so the evidence is recorded as resolved.",
      href: `/findings/${f.id}`,
      cta: "Open finding",
      tone: "good",
    });
  }

  const topOpen = findings
    .filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS")
    .sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime())
    .slice(0, 2);
  for (const f of topOpen) {
    focus.push({
      text: `Work through: ${f.title} on ${f.asset.name} (${f.severity.toLowerCase()})`,
      why: `Open since ${f.detectedAt.toISOString().slice(0, 10)}, ${daysBetween(f.detectedAt)} days. ${f.remediation ?? ""}`,
      href: `/findings/${f.id}`,
      cta: "Open finding",
      tone: f.severity === "CRITICAL" || f.severity === "HIGH" ? "warn" : "info",
    });
  }

  for (const a of expiring.slice(0, 2)) {
    focus.push({
      text: `Renew authorization for ${a.asset.name} (${a.daysLeft === 0 ? "expires today" : `expires in ${a.daysLeft} days`})`,
      why: `Scope: ${a.scope}. After this date no checks are permitted on that asset.`,
      href: "/authorizations",
      cta: "Open authorizations",
      tone: a.daysLeft <= 3 ? "critical" : "warn",
    });
  }

  for (const a of needsReview.slice(0, 2)) {
    focus.push({
      text: `Re-run a passive check on ${a.name}`,
      why: a.lastChecked
        ? `Last checked ${daysBetween(a.lastChecked)} days ago. Evidence may be out of date.`
        : "This asset has never been checked, so there is no evidence on file.",
      href: "/assets",
      cta: "Open assets",
      tone: "info",
    });
  }

  if (focus.length === 0) {
    focus.push({
      text: "No outstanding security work in the current scope",
      why: "No open findings, no expiring authorizations and no stale assets. A good moment to add scope or clean up the asset list.",
      href: "/assets",
      cta: "Open assets",
      tone: "good",
    });
  }

  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  const topic = LEARNING_TOPICS[dayIndex % LEARNING_TOPICS.length];

  return {
    date: now,
    focus: focus.slice(0, 6),
    counts: {
      newFindings: newFindings.length,
      newAdvisories: newAdvisories.length,
      newChecks: newChecks.length,
      fixedToday: fixedRecently.length,
      openFindings: findings.filter((f) => f.status === "OPEN" || f.status === "IN_PROGRESS").length,
      expiringSoon: expiring.length,
      needsReview: needsReview.length,
      newLeads: leads.filter((l) => l.status === "NEW").length,
    },
    newFindings,
    newAdvisories,
    expiring,
    needsReview,
    recentChecks: checkRuns,
    topic,
  };
}

function getSimpleKevMatches(
  assets: { name: string; technologies: string; version: string | null }[],
  advisories: { advisoryId: string; knownExploited: boolean; affectedTechnology: string; affectedVersions: string }[]
) {
  const out: { assetName: string; assetVersion: string; advisory: (typeof advisories)[number] }[] = [];
  for (const advisory of advisories.filter((a) => a.knownExploited)) {
    for (const asset of assets) {
      const techs = asset.technologies.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const match = techs.some((t) => {
        const target = advisory.affectedTechnology.toLowerCase();
        return t === target || t.includes(target) || target.includes(t);
      });
      if (match && asset.version && compareVersion(asset.version, advisory.affectedVersions) === true) {
        out.push({ assetName: asset.name, assetVersion: asset.version, advisory });
      }
    }
  }
  return out;
}
