import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { cleanupOrphanedTravelGroupMembers } from '@/lib/traveling-group';
import { hasFullTourCatalogAccess } from '@/lib/viewer-access';

export async function GET(_req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tourId } = await params;
  await cleanupOrphanedTravelGroupMembers(tourId);
  const members = await prisma.travelGroupMember.findMany({
    where: { tourId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      subgroup: m.subgroup,
      phone: m.phone,
      email: m.email,
      notes: m.notes,
    }))
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ tourId: string }> }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasFullTourCatalogAccess(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
  const body = await req.json();
  const { name, role: memberRole, subgroup, phone, email, notes, personId } = body;
  if (!name || !memberRole) return NextResponse.json({ error: 'name and role required' }, { status: 400 });
  let data: { tourId: string; name: string; role: string; subgroup: string | null; phone: string | null; email: string | null; notes: string | null; personId?: string } = {
    tourId,
    name,
    role: memberRole,
    subgroup: subgroup && String(subgroup).trim() ? String(subgroup).trim() : null,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  };
  if (personId) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (person) data.personId = personId;
  }
  const member = await prisma.travelGroupMember.create({ data });
  return NextResponse.json({ id: member.id });
}
