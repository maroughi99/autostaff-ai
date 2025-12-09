/*
  Warnings:

  - You are about to drop the column `customerId` on the `jobs` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
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
INSERT INTO "new_jobs" ("ccEmail", "companyName", "createdAt", "defaultShippingAddress", "description", "endDate", "fax", "firstName", "id", "invoiceBillToAddress", "isActive", "jobName", "jobTitle", "lastName", "leadId", "mainEmail", "mainPhone", "middleInitial", "mobile", "notes", "openingBalance", "openingBalanceDate", "other1", "shipToAddress", "startDate", "status", "title", "updatedAt", "website", "workPhone") SELECT "ccEmail", "companyName", "createdAt", "defaultShippingAddress", "description", "endDate", "fax", "firstName", "id", "invoiceBillToAddress", "isActive", "jobName", "jobTitle", "lastName", "leadId", "mainEmail", "mainPhone", "middleInitial", "mobile", "notes", "openingBalance", "openingBalanceDate", "other1", "shipToAddress", "startDate", "status", "title", "updatedAt", "website", "workPhone" FROM "jobs";
DROP TABLE "jobs";
ALTER TABLE "new_jobs" RENAME TO "jobs";
CREATE INDEX "jobs_leadId_idx" ON "jobs"("leadId");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
