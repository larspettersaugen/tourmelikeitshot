import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEdit } from '@/lib/session';
import { Prisma, type VenueCategory } from '@prisma/client';
import { isVenueCategory } from '@/lib/venue-category';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const where: Prisma.VenueWhereInput =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { loadInNotes: { contains: q, mode: 'insensitive' } },
            { cateringNotes: { contains: q, mode: 'insensitive' } },
            { accessNotes: { contains: q, mode: 'insensitive' } },
            ...( /^\d+$/.test(q) ? [{ capacity: parseInt(q, 10) }] : []),
          ],
        }
      : {};
  const venues = await prisma.venue.findMany({
    where,
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
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
  return NextResponse.json(venues);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const { name, city, address, notes, loadInNotes, cateringNotes, accessNotes, category, capacity } =
    body;
  if (!name?.trim() || !city?.trim()) {
    return NextResponse.json({ error: 'name and city required' }, { status: 400 });
  }
  let capacityValue: number | null = null;
  if (capacity !== undefined && capacity !== null && capacity !== '') {
    const n = typeof capacity === 'number' ? capacity : parseInt(String(capacity), 10);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: 'invalid capacity' }, { status: 400 });
    }
    capacityValue = n;
  }
  let categoryValue: VenueCategory = 'venue';
  if (category != null) {
    if (!isVenueCategory(category)) {
      return NextResponse.json({ error: 'invalid category' }, { status: 400 });
    }
    categoryValue = category;
  }
  const venue = await prisma.venue.create({
    data: {
      category: categoryValue,
      name: name.trim(),
      city: city.trim(),
      address: address?.trim() || null,
      capacity: capacityValue,
      notes: notes?.trim() || null,
      loadInNotes: loadInNotes?.trim() || null,
      cateringNotes: cateringNotes?.trim() || null,
      accessNotes: accessNotes?.trim() || null,
    },
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
