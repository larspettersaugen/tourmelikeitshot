/**
 * Assigns every traveling-group member on the GOLF "Sommer 2026" tour to every
 * tour date (TourDateMember rows). Same tour resolution as import-golf-sommer-2026-dates.ts.
 *
 *   npx dotenv -e .env -e .env.local -- tsx scripts/sync-golf-sommer-2026-crew-to-dates.ts
 *
 * Override: IMPORT_TOUR_ID=<tour-cuid>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    console.error(
      'No tour found (GOLF + Sommer 2026). Set IMPORT_TOUR_ID or create the tour first.'
    );
    process.exit(1);
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

  const members = await prisma.travelGroupMember.findMany({
    where: { tourId: tourRow.id },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });

  const memberIds = members.map((m) => m.id);

  if (memberIds.length === 0) {
    console.log('No traveling group members on this tour. Add crew on the tour first, then re-run.');
    return;
  }

  console.log(`Traveling group: ${memberIds.length} member(s)`);

  const dates = await prisma.tourDate.findMany({
    where: { tourId: tourRow.id },
    select: { id: true, date: true, venueName: true, city: true },
    orderBy: { date: 'asc' },
  });

  if (dates.length === 0) {
    console.log('No tour dates. Nothing to update.');
    return;
  }

  for (const d of dates) {
    const label = `${d.date.toISOString().slice(0, 10)} ${d.venueName ?? ''} ${d.city ?? ''}`.trim();
    await prisma.$transaction([
      prisma.tourDateMember.deleteMany({ where: { tourDateId: d.id } }),
      ...memberIds.map((travelGroupMemberId) =>
        prisma.tourDateMember.create({
          data: { tourDateId: d.id, travelGroupMemberId },
        })
      ),
    ]);
    console.log('  ✓', label);
  }

  console.log(
    `\nDone: assigned all ${memberIds.length} crew member(s) to ${dates.length} date(s).`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
