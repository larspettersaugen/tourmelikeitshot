-- Custom advance sections (user-defined, same checklist + files as standard four).
CREATE TABLE "AdvanceCustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advanceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Custom',
    "body" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "compromises" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvanceCustomField_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AdvanceCustomField_advanceId_idx" ON "AdvanceCustomField"("advanceId");
