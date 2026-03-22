import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canEditAdvance, canAccessAdvance } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessAdvance((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId } = await params;
  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    include: { advance: true },
  });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const a = tourDate.advance;
  return NextResponse.json({
    technicalInfo: a?.technicalInfo ?? null,
    rider: a?.rider ?? null,
    logistics: a?.logistics ?? null,
    equipmentTransport: a?.equipmentTransport ?? null,
    technicalDone: a?.technicalDone ?? false,
    technicalCompromises: a?.technicalCompromises ?? false,
    riderDone: a?.riderDone ?? false,
    riderCompromises: a?.riderCompromises ?? false,
    logisticsDone: a?.logisticsDone ?? false,
    logisticsCompromises: a?.logisticsCompromises ?? false,
    equipmentTransportDone: a?.equipmentTransportDone ?? false,
    equipmentTransportCompromises: a?.equipmentTransportCompromises ?? false,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tourId: string; dateId: string }> }
) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!canEditAdvance(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { tourId, dateId } = await params;
  const tourDate = await prisma.tourDate.findFirst({
    where: { id: dateId, tourId },
    include: { advance: true },
  });
  if (!tourDate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const data: {
    technicalInfo?: string | null;
    rider?: string | null;
    logistics?: string | null;
    equipmentTransport?: string | null;
    technicalDone?: boolean;
    technicalCompromises?: boolean;
    riderDone?: boolean;
    riderCompromises?: boolean;
    logisticsDone?: boolean;
    logisticsCompromises?: boolean;
    equipmentTransportDone?: boolean;
    equipmentTransportCompromises?: boolean;
  } = {};
  if ('technicalInfo' in body) data.technicalInfo = body.technicalInfo === '' || body.technicalInfo == null ? null : String(body.technicalInfo);
  if ('rider' in body) data.rider = body.rider === '' || body.rider == null ? null : String(body.rider);
  if ('logistics' in body) data.logistics = body.logistics === '' || body.logistics == null ? null : String(body.logistics);
  if ('equipmentTransport' in body) data.equipmentTransport = body.equipmentTransport === '' || body.equipmentTransport == null ? null : String(body.equipmentTransport);
  if (typeof body.technicalDone === 'boolean') data.technicalDone = body.technicalDone;
  if (typeof body.technicalCompromises === 'boolean') data.technicalCompromises = body.technicalCompromises;
  if (typeof body.riderDone === 'boolean') data.riderDone = body.riderDone;
  if (typeof body.riderCompromises === 'boolean') data.riderCompromises = body.riderCompromises;
  if (typeof body.logisticsDone === 'boolean') data.logisticsDone = body.logisticsDone;
  if (typeof body.logisticsCompromises === 'boolean') data.logisticsCompromises = body.logisticsCompromises;
  if (typeof body.equipmentTransportDone === 'boolean') data.equipmentTransportDone = body.equipmentTransportDone;
  if (typeof body.equipmentTransportCompromises === 'boolean') data.equipmentTransportCompromises = body.equipmentTransportCompromises;
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });
  if (tourDate.advance) {
    await prisma.advance.update({ where: { tourDateId: dateId }, data });
  } else {
    await prisma.advance.create({ data: { tourDateId: dateId, ...data } });
  }
  return NextResponse.json({ ok: true });
}
