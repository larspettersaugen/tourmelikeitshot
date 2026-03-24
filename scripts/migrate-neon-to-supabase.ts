/**
 * One-time migration: copies all data from Neon → Supabase Postgres.
 * Uses two Prisma clients with different database URLs.
 *
 * Usage:
 *   NEON_URL="postgresql://..." npx tsx scripts/migrate-neon-to-supabase.ts
 *
 * DATABASE_URL (in .env / .env.local) must already point to Supabase.
 */

import { PrismaClient } from '@prisma/client';

const NEON_URL = process.env.NEON_URL;
if (!NEON_URL || !NEON_URL.startsWith('postgres')) {
  console.error('Set NEON_URL env var to your Neon direct connection string.');
  process.exit(1);
}

const neon = new PrismaClient({ datasources: { db: { url: NEON_URL } } });
const supa = new PrismaClient();

async function wipe() {
  const tables = [
    'advanceFile', 'advance', 'tourDateTask', 'scheduleItem',
    'transportPassenger', 'transport', 'hotelGuest', 'hotel',
    'flightPassenger', 'flight', 'tourDateMember', 'contact',
    'tourDate', 'daySheetTemplateItem', 'daySheetTemplate',
    'travelGroupMember', 'invite', 'groupMember', 'group',
    'tour', 'project', 'person', 'passwordResetToken', 'user',
    'venueContact', 'venue',
  ] as const;
  for (const t of tables) {
    await (supa as unknown as Record<string, { deleteMany: () => Promise<unknown> }>)[t].deleteMany();
    console.log(`  cleared ${t}`);
  }
}

async function migrate() {
  console.log('\n=== Wiping Supabase tables ===');
  await wipe();

  console.log('\n=== Copying data Neon → Supabase ===');

  const users = await neon.user.findMany();
  console.log(`User: ${users.length}`);
  for (const r of users) await supa.user.create({ data: r });

  const prt = await neon.passwordResetToken.findMany();
  console.log(`PasswordResetToken: ${prt.length}`);
  for (const r of prt) await supa.passwordResetToken.create({ data: r });

  const venues = await neon.venue.findMany();
  console.log(`Venue: ${venues.length}`);
  for (const r of venues) await supa.venue.create({ data: r });

  const venueContacts = await neon.venueContact.findMany();
  console.log(`VenueContact: ${venueContacts.length}`);
  for (const r of venueContacts) await supa.venueContact.create({ data: r });

  const projects = await neon.project.findMany();
  console.log(`Project: ${projects.length}`);
  for (const r of projects) await supa.project.create({ data: r });

  const groups = await neon.group.findMany();
  console.log(`Group: ${groups.length}`);
  for (const r of groups) await supa.group.create({ data: r });

  const persons = await neon.person.findMany();
  console.log(`Person: ${persons.length}`);
  for (const r of persons) await supa.person.create({ data: r });

  const groupMembers = await neon.groupMember.findMany();
  console.log(`GroupMember: ${groupMembers.length}`);
  for (const r of groupMembers) await supa.groupMember.create({ data: r });

  const invites = await neon.invite.findMany();
  console.log(`Invite: ${invites.length}`);
  for (const r of invites) await supa.invite.create({ data: r });

  const tours = await neon.tour.findMany();
  console.log(`Tour: ${tours.length}`);
  for (const r of tours) await supa.tour.create({ data: r });

  const dstemplates = await neon.daySheetTemplate.findMany();
  console.log(`DaySheetTemplate: ${dstemplates.length}`);
  for (const r of dstemplates) await supa.daySheetTemplate.create({ data: r });

  const dsitems = await neon.daySheetTemplateItem.findMany();
  console.log(`DaySheetTemplateItem: ${dsitems.length}`);
  for (const r of dsitems) await supa.daySheetTemplateItem.create({ data: r });

  const tgm = await neon.travelGroupMember.findMany();
  console.log(`TravelGroupMember: ${tgm.length}`);
  for (const r of tgm) await supa.travelGroupMember.create({ data: r });

  const tourDates = await neon.tourDate.findMany();
  console.log(`TourDate: ${tourDates.length}`);
  for (const r of tourDates) await supa.tourDate.create({ data: r });

  const tasks = await neon.tourDateTask.findMany();
  console.log(`TourDateTask: ${tasks.length}`);
  for (const r of tasks) await supa.tourDateTask.create({ data: r });

  const advances = await neon.advance.findMany();
  console.log(`Advance: ${advances.length}`);
  for (const r of advances) await supa.advance.create({ data: r });

  const advFiles = await neon.advanceFile.findMany();
  console.log(`AdvanceFile: ${advFiles.length}`);
  for (const r of advFiles) await supa.advanceFile.create({ data: r });

  const scheduleItems = await neon.scheduleItem.findMany();
  console.log(`ScheduleItem: ${scheduleItems.length}`);
  for (const r of scheduleItems) await supa.scheduleItem.create({ data: r });

  const contacts = await neon.contact.findMany();
  console.log(`Contact: ${contacts.length}`);
  for (const r of contacts) await supa.contact.create({ data: r });

  const flights = await neon.flight.findMany();
  console.log(`Flight: ${flights.length}`);
  for (const r of flights) await supa.flight.create({ data: r });

  const fp = await neon.flightPassenger.findMany();
  console.log(`FlightPassenger: ${fp.length}`);
  for (const r of fp) await supa.flightPassenger.create({ data: r });

  const transports = await neon.transport.findMany();
  console.log(`Transport: ${transports.length}`);
  for (const r of transports) await supa.transport.create({ data: r });

  const tp = await neon.transportPassenger.findMany();
  console.log(`TransportPassenger: ${tp.length}`);
  for (const r of tp) await supa.transportPassenger.create({ data: r });

  const hotels = await neon.hotel.findMany();
  console.log(`Hotel: ${hotels.length}`);
  for (const r of hotels) await supa.hotel.create({ data: r });

  const hg = await neon.hotelGuest.findMany();
  console.log(`HotelGuest: ${hg.length}`);
  for (const r of hg) await supa.hotelGuest.create({ data: r });

  const tdm = await neon.tourDateMember.findMany();
  console.log(`TourDateMember: ${tdm.length}`);
  for (const r of tdm) await supa.tourDateMember.create({ data: r });

  console.log('\n=== Migration complete ===');
}

migrate()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await neon.$disconnect();
    await supa.$disconnect();
  });
