# Zak Security

A white-hat **security posture dashboard** for authorized work. Discover, authorize, observe, verify, prioritize, fix, re-test — with every finding traceable back to recorded evidence and every number explained in plain language.

This is a working prototype. It is deliberately conservative: it would rather report nothing than report a vulnerability it cannot prove.

> **Scope.** Built for authorized security review of your own assets or assets you have written permission to inspect. Without a recorded authorization, only non-intrusive public inspection runs. Nothing here attacks, exploits, brute-forces or bypasses anything.

---

## Why it exists

Most security tools produce a score you have to trust. Zak Security does the opposite:

- **No finding without evidence.** A finding is only created from a check result that carries non-empty evidence and a source. If the evidence is empty, the result is dropped, not reported.
- **No opaque score.** Priority is a list of plain-English reasons a human can check against the data — not a black-box number.
- **Scope is enforced in code, not in a promise.** Active checks require a live authorization row covering that check type for that asset. Everything else runs in passive mode.
- **Demo data can never contaminate a real assessment.** Every row is tagged `REAL` or `DEMO`, and demo rows are labelled in the UI.

---

## The safety contract

These are the properties the passive checker in [`src/lib/checks/passive-web.ts`](src/lib/checks/passive-web.ts) will not weaken:

| Limit | Value |
| --- | --- |
| Requests per target | exactly one `HEAD`, at most one `GET` |
| Redirects | followed manually, maximum 3 hops |
| Headers read | a small fixed allowlist |
| Body read | first 64 KB only, deterministic string patterns only |
| Timeout | 15 seconds total, hard cap |
| Cookies / auth / credentials | none, ever |
| Active techniques | none — no brute force, port scanning, fuzzing or auth bypass |

AI agents and MCP servers are reviewed from **declared configuration only** ([`src/lib/checks/agent-review.ts`](src/lib/checks/agent-review.ts)). The tool never connects to, probes, invokes or prompt-injects an agent or MCP server.

---

## Features

| Page | What it does |
| --- | --- |
| **Overview** | Posture at a glance: stats, a "needs attention" list with reasons, the priority queue, expiring authorizations, recently verified fixes and the activity log. |
| **Assets** | Inventory of websites, domains, repositories, AI agents and MCP servers, with derived authorization status and one-click passive checks. |
| **Authorizations** | Record written scope: who authorized it, the exact scope, the date range and which check types are permitted. |
| **Findings** | Every raised observation, ordered by the transparent priority engine, with inline status controls. |
| **Finding detail** | The evidence, the source, the fingerprint, every reason behind the priority, and re-test. |
| **Threat Intel** | Advisories matched against declared technologies and versions, with conservative `POTENTIAL_MATCH` vs `TECHNOLOGY_ONLY` verdicts. |
| **AI Remediation** | Fixes from in-repo templates (optionally AI-reworded prose), with verification steps. |
| **Security Leads** | Outreach opportunities phrased as opportunities, each requiring a source URL. |
| **Daily Briefing** | What changed today, what expires soon, what needs review, and a rotating learning topic. |
| **Settings** | Provider status, real-vs-demo counts, and the safety contract restated. |

---

## How priority works

`computePriority()` in [`src/lib/priority.ts`](src/lib/priority.ts) turns severity, asset importance, age, authorization state and known-exploited linkage into a tier (`CRITICAL` · `HIGH` · `MEDIUM` · `LOW`) **and a list of reasons**. The UI shows those reasons verbatim. There is no model in the loop for prioritisation, and nothing is invented.

## How threat matching works

`compareVersion()` and `getThreatIntel()` in [`src/lib/queries.ts`](src/lib/queries.ts) match advisories against **declared** asset versions. A `POTENTIAL_MATCH` is only reported when the declared version falls inside the advisory's declared affected range. Anything weaker is labelled `TECHNOLOGY_ONLY`. It never claims a confirmed vulnerable installation.

## How remediation works

[`src/lib/remediation/`](src/lib/remediation/) holds rule-based templates for each finding category. Code snippets **always** come from the templates. If `OPENAI_API_KEY` is set, only the prose (why it matters / recommended fix) is reworded by the model — it can never invent a config value.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Database | SQLite (Prisma) — no Docker required |
| ORM | Prisma 6 |
| Language | TypeScript (strict) |
| Icons | lucide-react |

---

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env      # sets DATABASE_URL="file:./dev.db"
npm run db:migrate        # create the SQLite database
npm run db:seed           # optional: load fictional DEMO data
npm run dev               # http://localhost:3000
```

A fresh database is **empty**. `npm run db:seed` loads clearly-tagged fictional sample records (reserved domains and invented companies) so the dashboard has something to show; it is never auto-seeded.

Production build:

```bash
npm run build
npm start
```

---

## Data modes

Every record carries `dataMode`: `REAL` or `DEMO`. Demo rows are fictional (`.test` / IANA-reserved domains, invented companies) and are labelled `DEMO DATA` in the UI. The overview and settings pages always show how many demo records are present so a real assessment can never be silently mixed with sample data.

---

## Project layout

```
src/
  app/                 routes + server actions
  components/          design-system pieces (Card, Table, Badge, Forms, …)
  lib/
    checks/            passive-web, agent-review, derive, runner
    remediation/       templates + optional OpenAI provider
    priority.ts        transparent rule-based priority engine
    queries.ts         read models (overview, findings, intel, briefing)
    constants.ts       styles + enums
prisma/
  schema.prisma        data model
  seed.ts              fictional DEMO fixtures
```

---

## Environment variables

All optional except `DATABASE_URL`.

```bash
DATABASE_URL="file:./dev.db"   # local SQLite database
OPENAI_API_KEY=                # optional: AI-reworded remediation prose
GITHUB_TOKEN=                  # optional: reserved for authenticated advisory lookups
```

`.env` is gitignored; `.env.example` is committed. Never commit real tokens.

---

## Status

A prototype, not a product. The check runner, passive checker, configuration review, priority engine, threat matching and remediation templates are implemented and exercised by the seeded demo flow. Before any remote or multi-user deployment you would need authentication, a Postgres migration and a review of the deployment configuration — none of which are included here on purpose.
