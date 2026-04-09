import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import type { VenueCategory } from '@prisma/client';
import { isVenueCategory } from '@/lib/venue-category';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      name: true,
      city: true,
      address: true,
      capacity: true,
      notes: true,
      loadInNotes: true,
      cateringNotes: true,
      accessNotes: true,
    },
  });
  if (!venue) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(venue);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: {
    category?: VenueCategory;
    name?: string;
    city?: string;
    address?: string | null;
    capacity?: number | null;
    notes?: string | null;
    loadInNotes?: string | null;
    cateringNotes?: string | null;
    accessNotes?: string | null;
  } = {};
  if (body.category !== undefined) {
    if (!isVenueCategory(body.category)) {
      return NextResponse.json({ error: 'invalid category' }, { status: 400 });
    }
    data.category = body.category;
  }
  if (body.name != null) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    data.name = n;
  }
  if (body.city != null) {
    const c = String(body.city).trim();
    if (!c) return NextResponse.json({ error: 'city cannot be empty' }, { status: 400 });
    data.city = c;
  }
  if (body.address !== undefined) data.address = body.address?.trim() || null;
  if (body.capacity !== undefined) {
    if (body.capacity === null || body.capacity === '') {
      data.capacity = null;
    } else {
      const n = typeof body.capacity === 'number' ? body.capacity : parseInt(String(body.capacity), 10);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: 'invalid capacity' }, { status: 400 });
      }
      data.capacity = n;
    }
  }
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.loadInNotes !== undefined) data.loadInNotes = body.loadInNotes?.trim() || null;
  if (body.cateringNotes !== undefined) data.cateringNotes = body.cateringNotes?.trim() || null;
  if (body.accessNotes !== undefined) data.accessNotes = body.accessNotes?.trim() || null;
  const venue = await prisma.venue.update({
    where: { id },
    data,
  });
  return NextResponse.json({
    id: venue.id,
    category: venue.category,
    name: venue.name,
    city: venue.city,
    address: venue.address,
    capacity: venue.capacity,
    notes: venue.notes,
    loadInNotes: venue.loadInNotes,
    cateringNotes: venue.cateringNotes,
    accessNotes: venue.accessNotes,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.venue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
