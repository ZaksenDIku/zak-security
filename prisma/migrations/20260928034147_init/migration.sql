-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "authorizationStatus" TEXT NOT NULL DEFAULT 'NOT_AUTHORIZED',
    "lastChecked" DATETIME,
    "notes" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'MEDIUM',
    "technologies" TEXT NOT NULL DEFAULT '',
    "version" TEXT,
    "dataMode" TEXT NOT NULL DEFAULT 'REAL',
    "aiTools" TEXT NOT NULL DEFAULT '',
    "aiPermissions" TEXT NOT NULL DEFAULT '',
    "aiExternalIntegrations" TEXT NOT NULL DEFAULT '',
    "aiHumanApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "aiSensitiveDataAccess" BOOLEAN NOT NULL DEFAULT false,
    "mcp_server_url" TEXT,
    "mcpAuthenticationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mcpToolsExposed" TEXT NOT NULL DEFAULT '',
    "mcpWriteAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Authorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "allowedChecks" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dataMode" TEXT NOT NULL DEFAULT 'REAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Authorization_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidenceData" TEXT NOT NULL DEFAULT '',
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remediation" TEXT,
    "verifiedAt" DATETIME,
    "reverifiedAt" DATETIME,
    "sourceType" TEXT NOT NULL DEFAULT 'PASSIVE_CHECK',
    "fingerprint" TEXT NOT NULL DEFAULT '',
    "dataMode" TEXT NOT NULL DEFAULT 'REAL',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Finding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'PASSIVE',
    "result" TEXT NOT NULL DEFAULT 'COMPLETED',
    "summary" TEXT NOT NULL DEFAULT '',
    "resultData" TEXT NOT NULL DEFAULT '',
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "dataMode" TEXT NOT NULL DEFAULT 'REAL',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "CheckRun_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThreatAdvisory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisoryId" TEXT NOT NULL,
    "cve" TEXT,
    "title" TEXT NOT NULL,
    "affectedTechnology" TEXT NOT NULL,
    "affectedVersions" TEXT NOT NULL DEFAULT '',
    "fixedVersion" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "knownExploited" BOOLEAN NOT NULL DEFAULT false,
    "patchAvailable" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "referenceUrl" TEXT NOT NULL DEFAULT '',
    "feed" TEXT NOT NULL DEFAULT 'OTHER',
    "dataMode" TEXT NOT NULL DEFAULT 'DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SecurityLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "observedIssue" TEXT NOT NULL,
    "serviceOpportunity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "sourceUrl" TEXT NOT NULL,
    "notes" TEXT,
    "dataMode" TEXT NOT NULL DEFAULT 'DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "assetId" TEXT,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "dataMode" TEXT NOT NULL DEFAULT 'REAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Remediation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "fix" TEXT NOT NULL,
    "examples" TEXT NOT NULL DEFAULT '[]',
    "verification" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'TEMPLATES',
    "dataMode" TEXT NOT NULL DEFAULT 'REAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_CheckRunToFinding" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CheckRunToFinding_A_fkey" FOREIGN KEY ("A") REFERENCES "CheckRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CheckRunToFinding_B_fkey" FOREIGN KEY ("B") REFERENCES "Finding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_authorizationStatus_idx" ON "Asset"("authorizationStatus");

-- CreateIndex
CREATE INDEX "Authorization_status_idx" ON "Authorization"("status");

-- CreateIndex
CREATE INDEX "Authorization_endDate_idx" ON "Authorization"("endDate");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_detectedAt_idx" ON "Finding"("detectedAt");

-- CreateIndex
CREATE INDEX "Finding_fingerprint_idx" ON "Finding"("fingerprint");

-- CreateIndex
CREATE INDEX "CheckRun_assetId_idx" ON "CheckRun"("assetId");

-- CreateIndex
CREATE INDEX "CheckRun_startedAt_idx" ON "CheckRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatAdvisory_advisoryId_key" ON "ThreatAdvisory"("advisoryId");

-- CreateIndex
CREATE INDEX "ThreatAdvisory_severity_idx" ON "ThreatAdvisory"("severity");

-- CreateIndex
CREATE INDEX "ThreatAdvisory_knownExploited_idx" ON "ThreatAdvisory"("knownExploited");

-- CreateIndex
CREATE INDEX "SecurityLead_status_idx" ON "SecurityLead"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_assetId_idx" ON "ActivityLog"("assetId");

-- CreateIndex
CREATE INDEX "Remediation_category_idx" ON "Remediation"("category");

-- CreateIndex
CREATE UNIQUE INDEX "_CheckRunToFinding_AB_unique" ON "_CheckRunToFinding"("A", "B");

-- CreateIndex
CREATE INDEX "_CheckRunToFinding_B_index" ON "_CheckRunToFinding"("B");
