-- AlterTable: add name parts (nullable first, then backfill, then NOT NULL)
ALTER TABLE "Person" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Person" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Person" ADD COLUMN "lastName" TEXT;

-- Backfill from existing "name" (first token, optional middle, last token)
UPDATE "Person" AS p
SET
  "firstName" = CASE
    WHEN s.card < 1 THEN ''
    ELSE COALESCE(s.parts[1], '')
  END,
  "lastName" = CASE
    WHEN s.card < 2 THEN ''
    ELSE COALESCE(s.parts[s.card], '')
  END,
  "middleName" = CASE
    WHEN s.card <= 2 THEN NULL
    ELSE NULLIF(trim(array_to_string(s.parts[2:(s.card - 1)], ' ')), '')
  END
FROM (
  SELECT
    id,
    regexp_split_to_array(trim(regexp_replace(COALESCE("name", ''), '\s+', ' ', 'g')), '\s+') AS parts,
    COALESCE(
      cardinality(
        regexp_split_to_array(trim(regexp_replace(COALESCE("name", ''), '\s+', ' ', 'g')), '\s+')
      ),
      0
    )::int AS card
  FROM "Person"
) AS s
WHERE p.id = s.id;

UPDATE "Person" SET "firstName" = '' WHERE "firstName" IS NULL;
UPDATE "Person" SET "lastName" = '' WHERE "lastName" IS NULL;

ALTER TABLE "Person" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Person" ALTER COLUMN "lastName" SET NOT NULL;
