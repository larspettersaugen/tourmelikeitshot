-- AlterTable
ALTER TABLE "VenueContact" ADD COLUMN "venueId" TEXT;

-- CreateIndex
CREATE INDEX "VenueContact_venueId_idx" ON "VenueContact"("venueId");

-- AddForeignKey
ALTER TABLE "VenueContact" ADD CONSTRAINT "VenueContact_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
