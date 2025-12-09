-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
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
    "openingBalance" REAL,
    "openingBalanceDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "serviceType" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "stage" TEXT NOT NULL DEFAULT 'new',
    "aiClassification" TEXT,
    "aiIntent" TEXT,
    "sentiment" TEXT,
    "appointmentDate" DATETIME,
    "appointmentNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_leads" ("address", "aiClassification", "aiIntent", "appointmentDate", "appointmentNotes", "createdAt", "description", "email", "id", "name", "notes", "phone", "priority", "sentiment", "serviceType", "source", "stage", "updatedAt", "userId") SELECT "address", "aiClassification", "aiIntent", "appointmentDate", "appointmentNotes", "createdAt", "description", "email", "id", "name", "notes", "phone", "priority", "sentiment", "serviceType", "source", "stage", "updatedAt", "userId" FROM "leads";
DROP TABLE "leads";
ALTER TABLE "new_leads" RENAME TO "leads";
CREATE INDEX "leads_userId_stage_idx" ON "leads"("userId", "stage");
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
