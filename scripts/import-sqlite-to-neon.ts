/**
 * One-way import: wipes the PostgreSQL database (DATABASE_URL) and copies all
 * rows from prisma/dev.db (legacy SQLite). Preserves IDs and relationships.
 *
 *   npm run db:import-sqlite
 *
 * DATABASE_URL is read from .env.local, then .env (must be postgresql://…).
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function loadDatabaseUrl(): void {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env.DATABASE_URL = v;
        return;
      }
    }
  }
}

/** SQLite may store datetimes as ISO strings or Prisma as epoch ms (integer). */
function dt(v: unknown): Date {
  if (v == null || v === '') return new Date();
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v);
  const s = String(v);
  if (/^\d+$/.test(s)) return new Date(Number(s));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function optDt(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v);
  const s = String(v);
  if (/^\d+$/.test(s)) return new Date(Number(s));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function bol(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  return Number(v) === 1;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function optStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function optNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  return Number(v);
}

function allRows(db: Database.Database, table: string): Record<string, unknown>[] {
  return db.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
}

/** Sequential deletes (no single long transaction — avoids Neon/Prisma 5s interactive timeout). */
async function wipe(prisma: PrismaClient): Promise<void> {
  await prisma.advanceFile.deleteMany();
  await prisma.advance.deleteMany();
  await prisma.scheduleItem.deleteMany();
  await prisma.transportPassenger.deleteMany();
  await prisma.transport.deleteMany();
  await prisma.hotelGuest.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.flightPassenger.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.tourDateMember.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.tourDate.deleteMany();
  await prisma.daySheetTemplateItem.deleteMany();
  await prisma.daySheetTemplate.deleteMany();
  await prisma.travelGroupMember.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.tour.deleteMany();
  await prisma.project.deleteMany();
  await prisma.person.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venueContact.deleteMany();
}

async function main(): Promise<void> {
  loadDatabaseUrl();
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgresql') && !url.startsWith('postgres')) {
    console.error('DATABASE_URL must be a PostgreSQL URL (e.g. Neon). Set it in .env.local.');
    process.exit(1);
  }

  const sqlitePath = path.join(process.cwd(), 'prisma', 'dev.db');
  if (!fs.existsSync(sqlitePath)) {
    console.error(`Missing ${sqlitePath} — add your SQLite file there.`);
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  const prisma = new PrismaClient();

  console.log('Wiping PostgreSQL (all app tables)…');
  await wipe(prisma);

  console.log('Importing User…');
  for (const r of allRows(sqlite, 'User')) {
    await prisma.user.create({
      data: {
        id: str(r.id),
        email: str(r.email),
        password: optStr(r.password),
        name: optStr(r.name),
        image: optStr(r.image),
        role: str(r.role),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing VenueContact…');
  for (const r of allRows(sqlite, 'VenueContact')) {
    await prisma.venueContact.create({
      data: {
        id: str(r.id),
        name: str(r.name),
        role: str(r.role),
        phone: optStr(r.phone),
        email: optStr(r.email),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing Project…');
  for (const r of allRows(sqlite, 'Project')) {
    await prisma.project.create({
      data: {
        id: str(r.id),
        name: str(r.name),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing Group…');
  for (const r of allRows(sqlite, 'Group')) {
    await prisma.group.create({
      data: {
        id: str(r.id),
        name: str(r.name),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing Person…');
  for (const r of allRows(sqlite, 'Person')) {
    await prisma.person.create({
      data: {
        id: str(r.id),
        name: str(r.name),
        type: str(r.type),
        birthdate: optDt(r.birthdate),
        phone: optStr(r.phone),
        email: optStr(r.email),
        streetName: optStr(r.streetName),
        zipCode: optStr(r.zipCode),
        county: optStr(r.county),
        timezone: optStr(r.timezone),
        notes: optStr(r.notes),
        userId: optStr(r.userId),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing Tour…');
  for (const r of allRows(sqlite, 'Tour')) {
    await prisma.tour.create({
      data: {
        id: str(r.id),
        projectId: optStr(r.projectId),
        name: str(r.name),
        timezone: str(r.timezone),
        startDate: optDt(r.startDate),
        endDate: optDt(r.endDate),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing DaySheetTemplate…');
  for (const r of allRows(sqlite, 'DaySheetTemplate')) {
    await prisma.daySheetTemplate.create({
      data: {
        id: str(r.id),
        tourId: optStr(r.tourId),
        name: str(r.name),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing DaySheetTemplateItem…');
  for (const r of allRows(sqlite, 'DaySheetTemplateItem')) {
    await prisma.daySheetTemplateItem.create({
      data: {
        id: str(r.id),
        templateId: str(r.templateId),
        time: str(r.time),
        endTime: optStr(r.endTime),
        durationMinutes: optNum(r.durationMinutes),
        label: str(r.label),
        notes: optStr(r.notes),
        sortOrder: Number(r.sortOrder ?? 0),
        dayAfter: bol(r.dayAfter),
      },
    });
  }

  console.log('Importing TravelGroupMember…');
  for (const r of allRows(sqlite, 'TravelGroupMember')) {
    await prisma.travelGroupMember.create({
      data: {
        id: str(r.id),
        tourId: str(r.tourId),
        personId: optStr(r.personId),
        name: str(r.name),
        role: str(r.role),
        subgroup: optStr(r.subgroup),
        phone: optStr(r.phone),
        email: optStr(r.email),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing TourDate…');
  for (const r of allRows(sqlite, 'TourDate')) {
    await prisma.tourDate.create({
      data: {
        id: str(r.id),
        tourId: str(r.tourId),
        venueName: str(r.venueName),
        city: str(r.city),
        date: dt(r.date),
        endDate: optDt(r.endDate),
        kind: str(r.kind),
        status: str(r.status),
        timezone: optStr(r.timezone),
        address: optStr(r.address),
        promoterName: optStr(r.promoterName),
        promoterPhone: optStr(r.promoterPhone),
        promoterEmail: optStr(r.promoterEmail),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing ScheduleItem…');
  for (const r of allRows(sqlite, 'ScheduleItem')) {
    await prisma.scheduleItem.create({
      data: {
        id: str(r.id),
        tourDateId: str(r.tourDateId),
        time: str(r.time),
        endTime: optStr(r.endTime),
        durationMinutes: optNum(r.durationMinutes),
        label: str(r.label),
        notes: optStr(r.notes),
        sortOrder: Number(r.sortOrder ?? 0),
        dayAfter: bol(r.dayAfter),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing Advance…');
  for (const r of allRows(sqlite, 'Advance')) {
    await prisma.advance.create({
      data: {
        id: str(r.id),
        tourDateId: str(r.tourDateId),
        technicalInfo: optStr(r.technicalInfo),
        rider: optStr(r.rider),
        logistics: optStr(r.logistics),
        equipmentTransport: optStr(r.equipmentTransport),
        technicalDone: bol(r.technicalDone),
        technicalCompromises: bol(r.technicalCompromises),
        riderDone: bol(r.riderDone),
        riderCompromises: bol(r.riderCompromises),
        logisticsDone: bol(r.logisticsDone),
        logisticsCompromises: bol(r.logisticsCompromises),
        equipmentTransportDone: bol(r.equipmentTransportDone),
        equipmentTransportCompromises: bol(r.equipmentTransportCompromises),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing AdvanceFile…');
  for (const r of allRows(sqlite, 'AdvanceFile')) {
    await prisma.advanceFile.create({
      data: {
        id: str(r.id),
        tourDateId: str(r.tourDateId),
        advanceSection: optStr(r.advanceSection),
        filename: str(r.filename),
        storedName: str(r.storedName),
        mimeType: optStr(r.mimeType),
        sizeBytes: optNum(r.sizeBytes),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing Transport…');
  for (const r of allRows(sqlite, 'Transport')) {
    await prisma.transport.create({
      data: {
        id: str(r.id),
        tourDateId: str(r.tourDateId),
        type: str(r.type),
        time: str(r.time),
        dayAfter: bol(r.dayAfter),
        driver: optStr(r.driver),
        driverPhone: optStr(r.driverPhone),
        driverEmail: optStr(r.driverEmail),
        company: optStr(r.company),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing TransportPassenger…');
  for (const r of allRows(sqlite, 'TransportPassenger')) {
    await prisma.transportPassenger.create({
      data: {
        id: str(r.id),
        transportId: str(r.transportId),
        travelGroupMemberId: str(r.travelGroupMemberId),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing Flight…');
  for (const r of allRows(sqlite, 'Flight')) {
    await prisma.flight.create({
      data: {
        id: str(r.id),
        tourId: str(r.tourId),
        tourDateId: optStr(r.tourDateId),
        departureTime: dt(r.departureTime),
        arrivalTime: dt(r.arrivalTime),
        departureAirport: str(r.departureAirport),
        arrivalAirport: str(r.arrivalAirport),
        flightNumber: optStr(r.flightNumber),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing FlightPassenger…');
  for (const r of allRows(sqlite, 'FlightPassenger')) {
    await prisma.flightPassenger.create({
      data: {
        id: str(r.id),
        flightId: str(r.flightId),
        travelGroupMemberId: str(r.travelGroupMemberId),
        bookingRef: optStr(r.bookingRef),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing Hotel…');
  for (const r of allRows(sqlite, 'Hotel')) {
    await prisma.hotel.create({
      data: {
        id: str(r.id),
        tourDateId: str(r.tourDateId),
        name: str(r.name),
        address: optStr(r.address),
        checkIn: dt(r.checkIn),
        checkOut: dt(r.checkOut),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing HotelGuest…');
  for (const r of allRows(sqlite, 'HotelGuest')) {
    await prisma.hotelGuest.create({
      data: {
        id: str(r.id),
        hotelId: str(r.hotelId),
        travelGroupMemberId: str(r.travelGroupMemberId),
        roomNumber: optStr(r.roomNumber),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing TourDateMember…');
  for (const r of allRows(sqlite, 'TourDateMember')) {
    await prisma.tourDateMember.create({
      data: {
        id: str(r.id),
        tourDateId: str(r.tourDateId),
        travelGroupMemberId: str(r.travelGroupMemberId),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing Contact…');
  for (const r of allRows(sqlite, 'Contact')) {
    await prisma.contact.create({
      data: {
        id: str(r.id),
        tourId: str(r.tourId),
        tourDateId: optStr(r.tourDateId),
        personId: optStr(r.personId),
        venueContactId: optStr(r.venueContactId),
        name: str(r.name),
        role: str(r.role),
        phone: optStr(r.phone),
        email: optStr(r.email),
        notes: optStr(r.notes),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  console.log('Importing Invite…');
  for (const r of allRows(sqlite, 'Invite')) {
    await prisma.invite.create({
      data: {
        id: str(r.id),
        personId: str(r.personId),
        token: str(r.token),
        expiresAt: dt(r.expiresAt),
        usedAt: optDt(r.usedAt),
        createdAt: dt(r.createdAt),
      },
    });
  }

  console.log('Importing GroupMember…');
  for (const r of allRows(sqlite, 'GroupMember')) {
    await prisma.groupMember.create({
      data: {
        id: str(r.id),
        groupId: str(r.groupId),
        personId: str(r.personId),
        role: str(r.role),
        subgroup: optStr(r.subgroup),
        createdAt: dt(r.createdAt),
        updatedAt: dt(r.updatedAt),
      },
    });
  }

  sqlite.close();
  await prisma.$disconnect();

  console.log('Import finished. People, tours, and linked data restored from prisma/dev.db.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
