-- Optional project owner (Person)
ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional tour manager (Person)
ALTER TABLE "Tour" ADD COLUMN "managerId" TEXT;
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
