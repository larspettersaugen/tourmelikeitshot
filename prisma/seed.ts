import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureProject(name: string) {
  const existing = await prisma.project.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.project.create({ data: { name } });
}

async function ensureTour(
  projectId: string,
  name: string,
  opts: { timezone?: string; startDate?: Date; endDate?: Date }
) {
  let t = await prisma.tour.findFirst({ where: { projectId, name } });
  if (t) return t;
  return prisma.tour.create({
    data: {
      projectId,
      name,
      timezone: opts.timezone ?? 'Europe/Oslo',
      startDate: opts.startDate ?? null,
      endDate: opts.endDate ?? null,
    },
  });
}

/** Add one show + schedule if the tour has no dates yet. */
async function ensureSampleShow(
  tourId: string,
  venueName: string,
  city: string,
  date: Date,
  schedule: { time: string; label: string; sortOrder: number; notes?: string }[]
) {
  const count = await prisma.tourDate.count({ where: { tourId } });
  if (count > 0) return;
  const tourDate = await prisma.tourDate.create({
    data: {
      tourId,
      venueName,
      city,
      date,
      kind: 'concert',
      address: `${city} venue`,
    },
  });
  await prisma.scheduleItem.createMany({
    data: schedule.map((s) => ({
      tourDateId: tourDate.id,
      time: s.time,
      label: s.label,
      sortOrder: s.sortOrder,
      ...(s.notes ? { notes: s.notes } : {}),
    })),
  });
}

async function main() {
  const adminPassword = await hash('admin123', 12);
  const editorPassword = await hash('editor123', 12);
  const viewerPassword = await hash('viewer123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@tour.local' },
    update: { password: adminPassword },
    create: { email: 'admin@tour.local', password: adminPassword, name: 'Admin', role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'editor@tour.local' },
    update: { password: editorPassword },
    create: { email: 'editor@tour.local', password: editorPassword, name: 'Editor', role: 'editor' },
  });
  await prisma.user.upsert({
    where: { email: 'viewer@tour.local' },
    update: { password: viewerPassword },
    create: { email: 'viewer@tour.local', password: viewerPassword, name: 'Viewer', role: 'viewer' },
  });

  // —— Artists & tours (idempotent) ——
  const chrisProject = await ensureProject('Chris Holsten');
  const chrisTour = await ensureTour(chrisProject.id, 'Oppe På Månen Tour', {
    timezone: 'Europe/Oslo',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-05-10'),
  });
  await ensureSampleShow(
    chrisTour.id,
    'Sentrum Scene',
    'Oslo',
    new Date('2026-03-15'),
    [
      { time: '14:00', label: 'Load-in', sortOrder: 0 },
      { time: '16:00', label: 'Soundcheck', sortOrder: 1 },
      { time: '19:00', label: 'Doors', sortOrder: 2 },
      { time: '20:00', label: 'Show', sortOrder: 3 },
      { time: '23:00', label: 'Load-out', sortOrder: 4 },
    ]
  );

  const astridProject = await ensureProject('Astrid S');
  const astridTour = await ensureTour(astridProject.id, 'Summer 2026', {
    timezone: 'Europe/Oslo',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
  });
  await ensureSampleShow(
    astridTour.id,
    'Rockefeller',
    'Oslo',
    new Date('2026-07-12'),
    [
      { time: '15:00', label: 'Load-in', sortOrder: 0 },
      { time: '17:00', label: 'Soundcheck', sortOrder: 1 },
      { time: '19:30', label: 'Doors', sortOrder: 2 },
      { time: '21:00', label: 'Show', sortOrder: 3 },
    ]
  );

  // Optional demo project (for quick tutorials)
  const demoProject = await ensureProject('Demo Artist');
  const demoTour = await ensureTour(demoProject.id, 'Spring 2025 Tour', {
    timezone: 'Europe/Oslo',
  });
  await ensureSampleShow(demoTour.id, 'Rock Club', 'Oslo', new Date('2025-03-01'), [
    { time: '14:00', label: 'Load-in', sortOrder: 0, notes: 'Back door' },
    { time: '16:00', label: 'Soundcheck', sortOrder: 1 },
    { time: '19:00', label: 'Doors', sortOrder: 2 },
    { time: '20:00', label: 'Show', sortOrder: 3 },
    { time: '23:00', label: 'Load-out', sortOrder: 4 },
  ]);

  const demoDate = await prisma.tourDate.findFirst({
    where: { tourId: demoTour.id },
    orderBy: { date: 'asc' },
  });
  if (demoDate) {
    const hasFlight = await prisma.flight.count({ where: { tourId: demoTour.id } });
    if (hasFlight === 0) {
      await prisma.flight.create({
        data: {
          tourId: demoTour.id,
          departureTime: new Date('2025-03-01T08:00:00'),
          arrivalTime: new Date('2025-03-01T10:30:00'),
          departureAirport: 'OSL',
          arrivalAirport: 'OSL',
          flightNumber: 'SK123',
        },
      });
    }
    const hasTransport = await prisma.transport.count({ where: { tourDateId: demoDate.id } });
    if (hasTransport === 0) {
      await prisma.transport.create({
        data: {
          tourDateId: demoDate.id,
          type: 'bus',
          time: '12:00',
          driver: 'John',
          company: 'Tour Bus Co',
          notes: 'Hotel pickup',
        },
      });
    }
    const hasContact = await prisma.contact.count({ where: { tourId: demoTour.id, tourDateId: demoDate.id } });
    if (hasContact === 0) {
      await prisma.contact.create({
        data: {
          tourId: demoTour.id,
          tourDateId: demoDate.id,
          name: 'Venue Manager',
          role: 'venue',
          phone: '+47 123 45 678',
          email: 'venue@rockclub.no',
        },
      });
    }
  }

  // —— People (idempotent upsert by email) ——
  const peopleData: { name: string; type: string; email: string; phone?: string }[] = [
    { name: 'Chris Holsten', type: 'superstar', email: 'chris.holsten@artist.local', phone: '+47 900 00 001' },
    { name: 'Astrid S', type: 'musician', email: 'astrid.s@artist.local', phone: '+47 900 00 002' },
    { name: 'Alex Stage', type: 'musician', email: 'alex@band.local', phone: '+47 111 22 333' },
    { name: 'Jordan Crew', type: 'crew', email: 'jordan@crew.local', phone: '+47 222 33 444' },
    { name: 'Morgan Tour', type: 'tour_manager', email: 'morgan@tour.local', phone: '+47 333 44 555' },
    { name: 'Sam Driver', type: 'driver', email: 'sam@transport.local', phone: '+47 444 55 666' },
    { name: 'Nora Production', type: 'productionmanager', email: 'nora@production.local', phone: '+47 555 66 777' },
    { name: 'Elias FOH', type: 'crew', email: 'elias@audio.local', phone: '+47 666 77 888' },
  ];

  for (const p of peopleData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name },
      create: { email: p.email, password: null, name: p.name, role: 'viewer' },
    });
    const existing = await prisma.person.findFirst({ where: { email: p.email } });
    if (existing) {
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          type: p.type,
          phone: p.phone ?? null,
          userId: user.id,
        },
      });
    } else {
      await prisma.person.create({
        data: {
          name: p.name,
          type: p.type,
          email: p.email,
          phone: p.phone ?? null,
          userId: user.id,
        },
      });
    }
  }

  console.log(
    'Seed done. Artists: Chris Holsten, Astrid S, Demo Artist. Login: admin@tour.local / admin123 (editor/editor123, viewer/viewer123)'
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
