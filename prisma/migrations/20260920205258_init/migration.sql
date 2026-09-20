-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitterName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "budgetRange" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "summary" TEXT,
    "technicalPattern" TEXT,
    "engagementShape" TEXT,
    "primaryConstraint" TEXT,
    "overallRisk" TEXT,
    "constraints" TEXT,
    "recommendedAction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
