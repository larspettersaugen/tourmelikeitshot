/**
 * Adds spreadsheet tour dates + venues for "Oppe På Månen" tour.
 * Skips venues that already match (name + city, case-insensitive), incl. (EKSTRA?) canonical match.
 * Skips tour dates already on the same calendar day with same venue + city.
 *
 *   npx dotenv -e .env -e .env.local -- tsx scripts/import-oppe-pa-manen-dates.ts
 */

import { PrismaClient } from '@prisma/client';
import { getTimezoneFromCity } from '../src/lib/timezone';

const prisma = new PrismaClient();

/** dd.mm.yyyy → UTC noon (stable calendar day) */
function parseSheetDate(dayDotMonthDotYear: string): Date {
  const [dd, mm, yyyy] = dayDotMonthDotYear.split('.').map((s) => parseInt(s, 10));
  return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
}

function utcDayParts(d: Date): { y: number; m: number; day: number } {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function sameUtcDay(a: Date, b: Date): boolean {
  const ua = utcDayParts(a);
  const ub = utcDayParts(b);
  return ua.y === ub.y && ua.m === ub.m && ua.day === ub.day;
}

function canonicalVenueName(name: string): string {
  return name.replace(/\s*\(EKSTRA\?\)\s*$/i, '').trim();
}

// DATO (dd.mm.yyyy), HVOR, BY — Konsert for all rows; Lillestrøm row year fixed to 2026
const SHEET_ROWS: [string, string, string][] = [
  ['11.02.2026', 'Alta Kultursal', 'Alta'],
  ['12.02.2026', 'Bryggeriet Scene (EKSTRA?)', 'Tromsø'],
  ['13.02.2026', 'Bryggeriet Scene', 'Tromsø'],
  ['14.02.2026', 'Arena Nord-Norge', 'Harstad'],
  ['18.02.2026', 'Kulturfabrikken', 'Sortland'],
  ['19.02.2026', 'Lofoten Kulturhus', 'Svolvær'],
  ['20.02.2026', 'Svømmehallen', 'Bodø'],
  ['21.02.2026', 'NTE Arena', 'Namsos'],
  ['24.02.2026', 'Byscenen (EKSTRA?)', 'Trondheim'],
  ['25.02.2026', 'Byscenen', 'Trondheim'],
  ['26.02.2026', 'Byscenen', 'Trondheim'],
  ['27.02.2026', 'Kulturhus', 'Oppdal'],
  ['28.02.2026', 'Storstuggu', 'Røros'],
  ['05.03.2026', 'Kulturfabrikken', 'Kristiansund'],
  ['06.03.2026', 'Bjørnsonhuset', 'Molde'],
  ['07.03.2026', 'Terminalen', 'Ålesund'],
  ['11.03.2026', 'USF Verftet', 'Bergen'],
  ['12.03.2026', 'USF Verftet', 'Bergen'],
  ['13.03.2026', 'Byscenen', 'Haugesund'],
  ['14.03.2026', 'Fiskepiren', 'Stavanger'],
  ['20.03.2026', 'Bølgen Kulturhus', 'Larvik'],
  ['21.03.2026', 'Caledonien Hall', 'Kristiansand'],
  ['25.03.2026', 'Sentrum Scene', 'Oslo'],
  ['26.03.2026', 'Sentrum Scene', 'Oslo'],
  ['27.03.2026', 'Sentrum Scene (EKSTRA?)', 'Oslo'],
  ['28.03.2026', 'Hamar Kulturhus', 'Hamar'],
  ['08.04.2026', 'Askim Kulturhus', 'Askim'],
  ['09.04.2026', 'Blå Grotte', 'Fredrikstad'],
  ['10.04.2026', 'Ibsenhuset Per Gynt Foajeen', 'Skien'],
  ['11.04.2026', 'Alles Kulturhus', 'Hønefoss'],
  ['16.04.2026', 'Kongsberg Musikkteater', 'Kongsberg'],
  ['17.04.2026', 'Union Scene', 'Drammen'],
  ['18.04.2026', 'Verket Scener', 'Moss'],
  ['25.04.2026', 'Brygga Kultursal', 'Halden'],
  ['30.04.2026', 'Harmonie Arena', 'Sandefjord'],
  ['01.05.2026', 'Lillestrøm Kultursenter', 'Lillestrøm'],
];

async function findOrCreateVenue(venueNameRaw: string, cityRaw: string): Promise<{ id: string; name: string }> {
  const city = cityRaw.trim();
  const venueName = venueNameRaw.trim();
  const canonical = canonicalVenueName(venueName);

  const cityMatch = { city: { equals: city, mode: 'insensitive' as const } };

  const exact = await prisma.venue.findFirst({
    where: { ...cityMatch, name: { equals: venueName, mode: 'insensitive' } },
  });
  if (exact) return { id: exact.id, name: exact.name };

  const byCanonical = await prisma.venue.findFirst({
    where: { ...cityMatch, name: { equals: canonical, mode: 'insensitive' } },
  });
  if (byCanonical) return { id: byCanonical.id, name: byCanonical.name };

  const created = await prisma.venue.create({
    data: {
      name: venueName,
      city,
    },
  });
  console.log('Created venue:', created.name, '/', created.city);
  return { id: created.id, name: created.name };
}

async function main() {
  const tour = await prisma.tour.findFirst({
    where: {
      OR: [
        { name: { contains: 'månen', mode: 'insensitive' } },
        { name: { contains: 'manen', mode: 'insensitive' } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!tour) {
    console.error('No tour found with "månen" or "manen" in the name. Create it first or rename the tour.');
    process.exit(1);
  }

  console.log('Tour:', tour.name, `(${tour.id})`);

  const existingDates = await prisma.tourDate.findMany({
    where: { tourId: tour.id },
    select: { id: true, date: true, venueName: true, city: true },
  });

  let createdDates = 0;
  let skippedDates = 0;

  const allShowDates: Date[] = [];

  for (const [dmy, hvor, by] of SHEET_ROWS) {
    const showDate = parseSheetDate(dmy);
    allShowDates.push(showDate);

    const { id: venueId, name: resolvedVenueName } = await findOrCreateVenue(hvor, by);

    const cityNorm = by.trim();

    const dup = existingDates.some(
      (e) =>
        sameUtcDay(e.date, showDate) &&
        e.city.trim().toLowerCase() === cityNorm.toLowerCase() &&
        e.venueName.trim().toLowerCase() === resolvedVenueName.trim().toLowerCase()
    );

    if (dup) {
      skippedDates++;
      continue;
    }

    const tz = getTimezoneFromCity(cityNorm);

    await prisma.tourDate.create({
      data: {
        tourId: tour.id,
        venueId,
        name: resolvedVenueName,
        venueName: resolvedVenueName,
        city: cityNorm,
        date: showDate,
        kind: 'concert',
        status: 'confirmed',
        timezone: tz,
      },
    });
    createdDates++;
    existingDates.push({
      id: 'new',
      date: showDate,
      venueName: resolvedVenueName,
      city: cityNorm,
    });
  }

  const minD = new Date(Math.min(...allShowDates.map((t) => t.getTime())));
  const maxD = new Date(Math.max(...allShowDates.map((t) => t.getTime())));

  const startMs = Math.min((tour.startDate ?? minD).getTime(), minD.getTime());
  const endMs = Math.max((tour.endDate ?? maxD).getTime(), maxD.getTime());

  await prisma.tour.update({
    where: { id: tour.id },
    data: {
      startDate: new Date(startMs),
      endDate: new Date(endMs),
    },
  });

  console.log('Done. Tour dates created:', createdDates, 'skipped (already there):', skippedDates);
  console.log('Tour window updated to include', minD.toISOString().slice(0, 10), '–', maxD.toISOString().slice(0, 10));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
