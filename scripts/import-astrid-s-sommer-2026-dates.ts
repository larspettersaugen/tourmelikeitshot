/**
 * Adds festival/show dates + venues for tour "Sommer 2026" under project "Astrid S".
 * Skips existing venues (name + city) and duplicate tour dates (same day + venue + city).
 *
 *   npx dotenv -e .env -e .env.local -- tsx scripts/import-astrid-s-sommer-2026-dates.ts
 *
 * Override: IMPORT_TOUR_ID=<tour-cuid>
 */

import { PrismaClient } from '@prisma/client';
import { getTimezoneFromCity } from '../src/lib/timezone';

const prisma = new PrismaClient();

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

/** From planning screenshots — dd.mm.yyyy, venue/event name, city */
const SHEET_ROWS: [string, string, string][] = [
  ['06.06.2026', 'Mjøsparken Live', 'Brumunddal'],
  ['13.06.2026', 'Event', 'Palma'],
  ['20.06.2026', 'OverOslo', 'Oslo'],
  ['26.06.2026', 'Steinkjerfestivalen', 'Steinkjer'],
  ['27.06.2026', 'Festidalen', 'Haugesund'],
  ['09.07.2026', 'Slottsfjell', 'Tønsberg'],
  ['17.07.2026', 'Rootsfestivalen', 'Brønnøysund'],
  ['25.07.2026', 'Fjærheia', 'Grimstad'],
  ['30.07.2026', 'Olavsfest', 'Trondheim'],
  ['01.08.2026', 'Raumarock', 'Åndalsnes'],
  ['20.08.2026', 'Hjertebank', 'Bodø'],
  ['22.08.2026', 'Lalala festival', 'Jakarta'],
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
    data: { name: venueName, city },
  });
  console.log('Created venue:', created.name, '/', created.city);
  return { id: created.id, name: created.name };
}

async function main() {
  const tourIdOverride = process.env.IMPORT_TOUR_ID?.trim();

  let tour = tourIdOverride
    ? await prisma.tour.findUnique({ where: { id: tourIdOverride } })
    : null;

  if (!tour) {
    // Project "Astrid S" + tour "Sommer 2026" (tour name does not include "Astrid")
    tour = await prisma.tour.findFirst({
      where: {
        AND: [
          { project: { name: { contains: 'astrid', mode: 'insensitive' } } },
          { name: { contains: 'sommer', mode: 'insensitive' } },
          { name: { contains: '2026', mode: 'insensitive' } },
        ],
      },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    if (!tour) {
      tour = await prisma.tour.findFirst({
        where: {
          AND: [
            { project: { name: { contains: 'astrid', mode: 'insensitive' } } },
            { name: { contains: 'sommer', mode: 'insensitive' } },
          ],
        },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      });
    }
  }

  if (!tour) {
    const underProject = await prisma.tour.findMany({
      where: { project: { name: { contains: 'astrid', mode: 'insensitive' } } },
      select: { name: true, id: true, project: { select: { name: true } } },
      take: 30,
    });
    console.error(
      'No tour found for project containing "Astrid" with tour "Sommer 2026".\n' +
        'Or set IMPORT_TOUR_ID=<tour-id> npx dotenv -e .env -e .env.local -- tsx scripts/import-astrid-s-sommer-2026-dates.ts'
    );
    if (underProject.length) {
      console.error(
        'Tours under Astrid project(s):',
        underProject.map((t) => `"${t.name}" (${t.id}) · ${t.project?.name ?? '—'}`).join(' | ')
      );
    }
    process.exit(1);
  }

  const tourRow = await prisma.tour.findUniqueOrThrow({
    where: { id: tour.id },
    include: { project: { select: { name: true } } },
  });

  console.log(
    'Tour:',
    tourRow.name,
    `(${tourRow.id})`,
    tourRow.project?.name ? `— project: ${tourRow.project.name}` : ''
  );

  const existingDates = await prisma.tourDate.findMany({
    where: { tourId: tourRow.id },
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
        tourId: tourRow.id,
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
  const startMs = Math.min((tourRow.startDate ?? minD).getTime(), minD.getTime());
  const endMs = Math.max((tourRow.endDate ?? maxD).getTime(), maxD.getTime());

  await prisma.tour.update({
    where: { id: tourRow.id },
    data: {
      startDate: new Date(startMs),
      endDate: new Date(endMs),
    },
  });

  console.log('Done. Tour dates created:', createdDates, 'skipped (already there):', skippedDates);
  console.log('Tour window:', minD.toISOString().slice(0, 10), '–', maxD.toISOString().slice(0, 10));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
