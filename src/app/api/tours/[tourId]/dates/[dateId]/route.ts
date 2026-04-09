import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId, dateId } = await params;
  const existing = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: {
    venueName?: string;
    city?: string;
    date?: Date;
    endDate?: Date | null;
    kind?: string;
    status?: string;
    address?: string | null;
    timezone?: string | null;
    promoterName?: string | null;
    promoterPhone?: string | null;
    promoterEmail?: string | null;
    notes?: string | null;
    guestListCapacity?: number | null;
    guestListCapacityLocked?: boolean;
    venueId?: string | null;
    name?: string | null;
  } = {};
  if ('name' in body) data.name = body.name === '' || body.name == null ? null : String(body.name).trim();
  if (body.venueName != null) data.venueName = body.venueName;
  if (body.city != null) data.city = body.city;
  if (body.date != null) data.date = new Date(body.date);
  if ('endDate' in body) data.endDate = body.endDate == null || body.endDate === '' ? null : new Date(body.endDate);
  if (body.kind != null) {
    const valid = ['concert', 'event', 'travelday', 'preproduction', 'rehearsal'];
    if (valid.includes(body.kind)) data.kind = body.kind;
  }
  if (body.status != null) {
    const valid = ['confirmed', 'tbc', 'cancelled', 'pitch', 'opportunity', 'lost_pitch'];
    if (valid.includes(body.status)) data.status = body.status;
  }
  if ('address' in body) data.address = body.address === '' || body.address == null ? null : body.address;
  if ('timezone' in body) data.timezone = body.timezone === '' || body.timezone == null ? null : body.timezone;
  if ('promoterName' in body) data.promoterName = body.promoterName === '' || body.promoterName == null ? null : body.promoterName;
  if ('promoterPhone' in body) data.promoterPhone = body.promoterPhone === '' || body.promoterPhone == null ? null : body.promoterPhone;
  if ('promoterEmail' in body) data.promoterEmail = body.promoterEmail === '' || body.promoterEmail == null ? null : body.promoterEmail;
  if ('notes' in body) data.notes = body.notes === '' || body.notes == null ? null : body.notes;
  const unlockInRequest = 'guestListCapacityLocked' in body && body.guestListCapacityLocked === false;
  if ('guestListCapacity' in body && existing.guestListCapacityLocked && !unlockInRequest) {
    return NextResponse.json(
      { error: 'Guest list capacity is locked. Unlock it before changing or clearing the limit.' },
      { status: 400 }
    );
  }
  if ('guestListCapacity' in body) {
    if (body.guestListCapacity == null || body.guestListCapacity === '') {
      data.guestListCapacity = null;
    } else {
      const n = Number(body.guestListCapacity);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return NextResponse.json({ error: 'guestListCapacity must be a non-negative integer' }, { status: 400 });
      }
      data.guestListCapacity = n;
    }
  }
  if ('guestListCapacityLocked' in body) {
    data.guestListCapacityLocked = Boolean(body.guestListCapacityLocked);
  }
  if ('venueId' in body) {
    if (body.venueId == null || body.venueId === '') data.venueId = null;
    else {
      const v = await prisma.venue.findUnique({ where: { id: String(body.venueId) } });
      if (!v) return NextResponse.json({ error: 'Venue not found' }, { status: 400 });
      data.venueId = v.id;
    }
  }
  if (body.city && !('timezone' in body)) {
    const { getTimezoneFromCity } = await import('@/lib/timezone');
    data.timezone = getTimezoneFromCity(body.city) || null;
  }
  await prisma.tourDate.update({ where: { id: dateId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { error: 'Deletion is disabled. Work is never removed from the app.' },
    { status: 403 }
  );
}
