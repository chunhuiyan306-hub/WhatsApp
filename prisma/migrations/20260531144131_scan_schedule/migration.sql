-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scanMode" TEXT NOT NULL DEFAULT 'schedule',
    "scanSchedule" TEXT NOT NULL DEFAULT '["10:00","15:00"]',
    "scanIntervalMs" INTEGER NOT NULL DEFAULT 300000,
    "lastScanAt" DATETIME,
    "lastScanSlot" TEXT,
    "lastScanStatus" TEXT,
    "lastScanSummary" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AutomationState" ("enabled", "id", "lastScanAt", "lastScanStatus", "lastScanSummary", "scanIntervalMs", "updatedAt") SELECT "enabled", "id", "lastScanAt", "lastScanStatus", "lastScanSummary", "scanIntervalMs", "updatedAt" FROM "AutomationState";
DROP TABLE "AutomationState";
ALTER TABLE "new_AutomationState" RENAME TO "AutomationState";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
