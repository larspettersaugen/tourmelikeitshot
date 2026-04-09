/**
 * Adds show dates + venues for tour "Sommer 2026" under project "GOLF".
 * Creates project "GOLF" and tour "Sommer 2026" if missing.
 * Skips duplicate tour dates (same UTC day + venue + city).
 *
 *   npx dotenv -e .env -e .env.local -- tsx scripts/import-golf-sommer-2026-dates.ts
 *
 * Override target tour: IMPORT_TOUR_ID=<tour-cuid>
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

/** dd.mm.yyyy, event/show name, city — GOLF Sommer 2026 planning */
const SHEET_ROWS: [string, string, string][] = [
  ['09.05.2026', 'Event Asko', 'Oslo'],
  ['15.05.2026', 'Tryvannstreffet', 'Oslo'],
  ['17.05.2026', '17. Mai fest', 'Bergen'],
  ['30.05.2026', 'Jærnatta', 'Bryne'],
  ['05.06.2026', 'Neon', 'Trondheim'],
  ['06.06.2026', 'Fjordkraft Event', 'Harstad'],
  ['13.06.2026', 'Event Trysil', 'Innbygda'],
  ['19.06.2026', 'Elvebris', 'Elverum'],
  ['25.06.2026', 'Palmesus Jr.', 'Oslo'],
  ['26.06.2026', 'Sverige', 'Nyköping'],
  ['07.07.2026', 'Vastervik', 'Västervik'],
  ['09.07.2026', 'Slottsfjell + UNG', 'Tønsberg'],
  ['10.07.2026', 'Slottsfjell + UNG', 'Tønsberg'],
  ['14.07.2026', 'Larkollenuka', 'Larkollen'],
  ['18.07.2026', 'Kalix Sommarfest', 'Kalix'],
  ['24.07.2026', 'Utkantfestival', 'Gulen'],
  ['01.08.2026', 'Østersund', 'Östersund kommune'],
  ['10.08.2026', 'Fadderuken Bergen', 'Bergen'],
  ['12.08.2026', 'Fadderullan', 'Oslo'],
  ['20.08.2026', 'Hjertebank', 'Bodø'],
  ['21.08.2026', 'Ypsilon', 'Drammen'],
  ['22.08.2026', 'Jugendfest', 'Ålesund'],
  ['29.08.2026', 'Verket', 'Mo i Rana'],
  ['05.09.2026', 'Spirefest Terminalen', 'Ålesund'],
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

async function resolveTour() {
  const tourIdOverride = process.env.IMPORT_TOUR_ID?.trim();
  if (tourIdOverride) {
    const t = await prisma.tour.findUnique({
      where: { id: tourIdOverride },
      include: { project: { select: { name: true } } },
    });
    if (!t) {
      console.error('IMPORT_TOUR_ID not found:', tourIdOverride);
      process.exit(1);
    }
    return t;
  }

  let tour = await prisma.tour.findFirst({
    where: {
      AND: [
        { project: { name: { equals: 'GOLF', mode: 'insensitive' } } },
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
          { project: { name: { contains: 'golf', mode: 'insensitive' } } },
          { name: { contains: 'sommer', mode: 'insensitive' } },
          { name: { contains: '2026', mode: 'insensitive' } },
        ],
      },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!tour) {
    let project = await prisma.project.findFirst({
      where: { name: { equals: 'GOLF', mode: 'insensitive' } },
    });
    if (!project) {
      project = await prisma.project.create({ data: { name: 'GOLF' } });
      console.log('Created project:', project.name, `(${project.id})`);
    }
    tour = await prisma.tour.create({
      data: {
        projectId: project.id,
        name: 'Sommer 2026',
        timezone: 'Europe/Oslo',
      },
      include: { project: { select: { name: true } } },
    });
    console.log('Created tour:', tour.name, `(${tour.id})`);
  }

  return tour;
}

async function main() {
  const tourRow = await resolveTour();

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
