-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quote_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_quote_items" ("createdAt", "description", "id", "quantity", "quoteId", "total", "unitPrice") SELECT "createdAt", "description", "id", "quantity", "quoteId", "total", "unitPrice" FROM "quote_items";
DROP TABLE "quote_items";
ALTER TABLE "new_quote_items" RENAME TO "quote_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
