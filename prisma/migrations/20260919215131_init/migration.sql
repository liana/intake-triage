-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT,
    "riskChecklist" TEXT,
    "triageStatus" TEXT,
    "triageError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
