-- AlterTable
ALTER TABLE "TourDate" ADD COLUMN "venueId" TEXT;

-- CreateIndex
CREATE INDEX "TourDate_venueId_idx" ON "TourDate"("venueId");

-- AddForeignKey
ALTER TABLE "TourDate" ADD CONSTRAINT "TourDate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
