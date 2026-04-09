-- CreateEnum
CREATE TYPE "VenueCategory" AS ENUM ('venue', 'festival');

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "category" "VenueCategory" NOT NULL DEFAULT 'venue';
