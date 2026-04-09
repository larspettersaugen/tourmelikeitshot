-- AlterTable
ALTER TABLE "TourDate" ADD COLUMN "guestListCapacity" INTEGER;

-- CreateTable
CREATE TABLE "TourDateGuestListEntry" (
    "id" TEXT NOT NULL,
    "tourDateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL DEFAULT 1,
    "representing" TEXT,
    "phone" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourDateGuestListEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TourDateGuestListEntry" ADD CONSTRAINT "TourDateGuestListEntry_tourDateId_fkey" FOREIGN KEY ("tourDateId") REFERENCES "TourDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
