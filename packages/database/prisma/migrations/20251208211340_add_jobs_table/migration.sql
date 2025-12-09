-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "customerId" TEXT,
    "openingBalance" REAL,
    "openingBalanceDate" DATETIME,
    "companyName" TEXT,
    "title" TEXT,
    "firstName" TEXT,
    "middleInitial" TEXT,
    "lastName" TEXT,
    "jobTitle" TEXT,
    "mainPhone" TEXT,
    "workPhone" TEXT,
    "mobile" TEXT,
    "fax" TEXT,
    "mainEmail" TEXT,
    "ccEmail" TEXT,
    "website" TEXT,
    "other1" TEXT,
    "invoiceBillToAddress" TEXT,
    "shipToAddress" TEXT,
    "defaultShippingAddress" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "jobs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "jobs_leadId_idx" ON "jobs"("leadId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
