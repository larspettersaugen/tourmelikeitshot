import { tool } from 'ai';
import { z } from 'zod/v4';
import { prisma } from '@/lib/prisma';
import { hasFullTourCatalogAccess, getViewerAssignedTourIds, userMayAccessTour } from '@/lib/viewer-access';
import { userCanOpenTourDateDetail } from '@/lib/tour-date-access';
import { canViewTasks, canAccessAdvance, canEditAdvance, canEdit } from '@/lib/session';
import { format } from 'date-fns';

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return format(new Date(d), 'yyyy-MM-dd');
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '';
  return format(new Date(d), 'yyyy-MM-dd HH:mm');
}

async function getPersonIdForUser(userId: string): Promise<string | null> {
  const person = await prisma.person.findFirst({
    where: { userId },
    select: { id: true },
  });
  return person?.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getChatTools(userId: string, role: string | undefined): Record<string, any> {
  const isFullCatalog = hasFullTourCatalogAccess(role);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  // ---- All roles ----

  tools.get_my_upcoming_dates = tool({
    description:
      'Get the current user\'s upcoming tour dates (shows, travel days, etc). Returns date, venue, city, tour name, and kind.',
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (isFullCatalog) {
        const dates = await prisma.tourDate.findMany({
          where: { date: { gte: now } },
          orderBy: { date: 'asc' },
          take: 30,
          select: {
            id: true, name: true, venueName: true, city: true, date: true, endDate: true,
            kind: true, status: true, tourId: true,
            tour: { select: { name: true, project: { select: { name: true } } } },
          },
        });
        return dates.map((d) => ({
          id: d.id, tourId: d.tourId,
          tourName: d.tour.name, projectName: d.tour.project?.name ?? null,
          name: d.name, venue: d.venueName, city: d.city,
          date: fmtDate(d.date), endDate: fmtDate(d.endDate), kind: d.kind, status: d.status,
        }));
      }

      const tourIds = await getViewerAssignedTourIds(userId);
      if (tourIds.length === 0) return [];

      const personId = await getPersonIdForUser(userId);
      if (!personId) return [];

      const travelMembers = await prisma.travelGroupMember.findMany({
        where: { personId, tourId: { in: tourIds } },
        select: { id: true, tourId: true },
      });
      if (travelMembers.length === 0) return [];

      const memberIds = travelMembers.map((m) => m.id);
      const dateMembers = await prisma.tourDateMember.findMany({
        where: { travelGroupMemberId: { in: memberIds }, tourDate: { date: { gte: now } } },
        select: {
          tourDate: {
            select: {
              id: true, name: true, venueName: true, city: true, date: true, endDate: true,
              kind: true, status: true, tourId: true,
              tour: { select: { name: true, project: { select: { name: true } } } },
            },
          },
        },
        orderBy: { tourDate: { date: 'asc' } },
      });

      const seen = new Set<string>();
      return dateMembers
        .filter((dm) => { if (seen.has(dm.tourDate.id)) return false; seen.add(dm.tourDate.id); return true; })
        .slice(0, 30)
        .map((dm) => {
          const d = dm.tourDate;
          return {
            id: d.id, tourId: d.tourId,
            tourName: d.tour.name, projectName: d.tour.project?.name ?? null,
            name: d.name, venue: d.venueName, city: d.city,
            date: fmtDate(d.date), endDate: fmtDate(d.endDate), kind: d.kind, status: d.status,
          };
        });
    },
  });

  tools.get_tour_info = tool({
    description: 'Get basic information about a specific tour (name, dates, project, manager).',
    inputSchema: z.object({ tourId: z.string().describe('The tour ID') }),
    execute: async ({ tourId }: { tourId: string }) => {
      if (!(await userMayAccessTour(userId, role, tourId))) {
        return { error: 'You do not have access to this tour.' };
      }
      const t = await prisma.tour.findUnique({
        where: { id: tourId },
        select: {
          id: true, name: true, timezone: true, startDate: true, endDate: true,
          project: { select: { name: true } },
          manager: { select: { name: true } },
          _count: { select: { dates: true, travelingMembers: true } },
        },
      });
      if (!t) return { error: 'Tour not found.' };
      return {
        name: t.name, projectName: t.project?.name ?? null,
        manager: t.manager?.name ?? null, timezone: t.timezone,
        startDate: fmtDate(t.startDate), endDate: fmtDate(t.endDate),
        dateCount: t._count.dates, crewCount: t._count.travelingMembers,
      };
    },
  });

  tools.get_date_schedule = tool({
    description: 'Get the day-sheet schedule for a specific tour date (times, labels, notes).',
    inputSchema: z.object({
      tourId: z.string().describe('The tour ID'),
      dateId: z.string().describe('The tour date ID'),
    }),
    execute: async ({ tourId, dateId }: { tourId: string; dateId: string }) => {
      if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
        return { error: 'You do not have access to this date.' };
      }
      const items = await prisma.scheduleItem.findMany({
        where: { tourDateId: dateId },
        orderBy: [{ dayAfter: 'asc' }, { sortOrder: 'asc' }, { time: 'asc' }],
        select: { id: true, time: true, endTime: true, label: true, notes: true, dayAfter: true },
      });
      const td = await prisma.tourDate.findUnique({
        where: { id: dateId },
        select: { name: true, venueName: true, city: true, date: true, kind: true, status: true },
      });
      return {
        date: td ? { name: td.name, venue: td.venueName, city: td.city, date: fmtDate(td.date), kind: td.kind, status: td.status } : null,
        schedule: items.map((i) => ({
          id: i.id, time: i.time, endTime: i.endTime, label: i.label, notes: i.notes,
          dayAfter: i.dayAfter || undefined,
        })),
      };
    },
  });

  tools.get_date_travel = tool({
    description: 'Get transport and hotel information for a specific tour date.',
    inputSchema: z.object({
      tourId: z.string().describe('The tour ID'),
      dateId: z.string().describe('The tour date ID'),
    }),
    execute: async ({ tourId, dateId }: { tourId: string; dateId: string }) => {
      if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
        return { error: 'You do not have access to this date.' };
      }
      const transports = await prisma.transport.findMany({
        where: { tourDateId: dateId },
        orderBy: { time: 'asc' },
        select: {
          id: true, type: true, time: true, dayAfter: true, driver: true, driverPhone: true,
          company: true, notes: true,
          passengers: { select: { travelGroupMember: { select: { name: true } } } },
        },
      });
      const hotels = await prisma.hotel.findMany({
        where: { tourDateId: dateId },
        select: {
          id: true, name: true, address: true, checkIn: true, checkOut: true, notes: true,
          guests: { select: { roomNumber: true, travelGroupMember: { select: { name: true } } } },
        },
      });
      return {
        transports: transports.map((t) => ({
          id: t.id, type: t.type, time: t.time, dayAfter: t.dayAfter || undefined,
          driver: t.driver, driverPhone: t.driverPhone, company: t.company, notes: t.notes,
          passengers: t.passengers.map((p) => p.travelGroupMember.name),
        })),
        hotels: hotels.map((h) => ({
          id: h.id, name: h.name, address: h.address,
          checkIn: fmtDateTime(h.checkIn), checkOut: fmtDateTime(h.checkOut),
          notes: h.notes,
          guests: h.guests.map((g) => ({ name: g.travelGroupMember.name, room: g.roomNumber })),
        })),
      };
    },
  });

  tools.get_date_flights = tool({
    description: 'Get flights associated with a specific tour or tour date.',
    inputSchema: z.object({
      tourId: z.string().describe('The tour ID'),
      dateId: z.string().optional().describe('Optional tour date ID to filter flights'),
    }),
    execute: async ({ tourId, dateId }: { tourId: string; dateId?: string }) => {
      if (!(await userMayAccessTour(userId, role, tourId))) {
        return { error: 'You do not have access to this tour.' };
      }
      const where: Record<string, unknown> = { tourId };
      if (dateId) where.tourDateId = dateId;

      const flights = await prisma.flight.findMany({
        where,
        orderBy: { departureTime: 'asc' },
        select: {
          flightNumber: true, departureAirport: true, arrivalAirport: true,
          departureTime: true, arrivalTime: true, notes: true,
          passengers: { select: { bookingRef: true, travelGroupMember: { select: { name: true } } } },
        },
      });
      return flights.map((f) => ({
        flightNumber: f.flightNumber, from: f.departureAirport, to: f.arrivalAirport,
        departure: fmtDateTime(f.departureTime), arrival: fmtDateTime(f.arrivalTime),
        notes: f.notes,
        passengers: f.passengers.map((p) => ({ name: p.travelGroupMember.name, bookingRef: p.bookingRef })),
      }));
    },
  });

  // ---- power_user and above: advance, tasks ----

  if (canAccessAdvance(role)) {
    tools.get_advance_info = tool({
      description: 'Get advance information for a tour date (technical, rider, logistics, equipment, custom fields).',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
      }),
      execute: async ({ tourId, dateId }: { tourId: string; dateId: string }) => {
        if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
          return { error: 'You do not have access to this date.' };
        }
        const advance = await prisma.advance.findUnique({
          where: { tourDateId: dateId },
          select: {
            technicalInfo: true, technicalDone: true, technicalCompromises: true,
            rider: true, riderDone: true, riderCompromises: true,
            logistics: true, logisticsDone: true, logisticsCompromises: true,
            equipmentTransport: true, equipmentTransportDone: true, equipmentTransportCompromises: true,
            customFields: {
              orderBy: { sortOrder: 'asc' },
              select: { title: true, body: true, done: true, compromises: true },
            },
          },
        });
        if (!advance) return { message: 'No advance information has been entered for this date yet.' };
        return advance;
      },
    });
  }

  if (canViewTasks(role)) {
    tools.get_date_tasks = tool({
      description: 'Get the task checklist for a specific tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
      }),
      execute: async ({ tourId, dateId }: { tourId: string; dateId: string }) => {
        if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
          return { error: 'You do not have access to this date.' };
        }
        const tasks = await prisma.tourDateTask.findMany({
          where: { tourDateId: dateId },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true, done: true },
        });
        return tasks;
      },
    });
  }

  // ---- admin / editor / superadmin only ----

  if (isFullCatalog) {
    tools.get_guest_list = tool({
      description: 'Get the guest list for a specific tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
      }),
      execute: async ({ tourId, dateId }: { tourId: string; dateId: string }) => {
        if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
          return { error: 'You do not have access to this date.' };
        }
        const td = await prisma.tourDate.findUnique({
          where: { id: dateId },
          select: { guestListCapacity: true, guestListCapacityLocked: true },
        });
        const entries = await prisma.tourDateGuestListEntry.findMany({
          where: { tourDateId: dateId },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, ticketCount: true, representing: true, phone: true },
        });
        const totalTickets = entries.reduce((sum, e) => sum + e.ticketCount, 0);
        return {
          capacity: td?.guestListCapacity ?? null,
          locked: td?.guestListCapacityLocked ?? false,
          totalTickets,
          entries,
        };
      },
    });

    tools.get_all_tours = tool({
      description: 'List all tours, optionally filtered by project name or tour name.',
      inputSchema: z.object({
        search: z.string().optional().describe('Optional search term to filter by tour or project name'),
      }),
      execute: async ({ search }: { search?: string }) => {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
          ];
        }
        const tours = await prisma.tour.findMany({
          where,
          orderBy: { startDate: 'desc' },
          take: 30,
          select: {
            id: true, name: true, startDate: true, endDate: true,
            project: { select: { name: true } },
            manager: { select: { name: true } },
            _count: { select: { dates: true } },
          },
        });
        return tours.map((t) => ({
          id: t.id, name: t.name, projectName: t.project?.name ?? null,
          manager: t.manager?.name ?? null,
          startDate: fmtDate(t.startDate), endDate: fmtDate(t.endDate),
          dateCount: t._count.dates,
        }));
      },
    });

    tools.get_people = tool({
      description: 'Search the people directory (crew, artists, managers, drivers).',
      inputSchema: z.object({
        search: z.string().describe('Name or partial name to search for'),
      }),
      execute: async ({ search }: { search: string }) => {
        const people = await prisma.person.findMany({
          where: { name: { contains: search, mode: 'insensitive' } },
          take: 20,
          select: {
            id: true, name: true, type: true, phone: true, email: true,
          },
        });
        return people;
      },
    });

    tools.get_venues = tool({
      description: 'Search the venue directory.',
      inputSchema: z.object({
        search: z.string().describe('Venue name or city to search for'),
      }),
      execute: async ({ search }: { search: string }) => {
        const venues = await prisma.venue.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          },
          take: 20,
          select: {
            id: true, name: true, city: true, category: true, capacity: true, address: true,
          },
        });
        return venues;
      },
    });
  }

  // ===========================================================================
  // WRITE TOOLS — power_user + above: tasks, advance
  // ===========================================================================

  if (canEditAdvance(role)) {
    tools.add_task = tool({
      description: 'Add a new task to a tour date checklist.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        title: z.string().describe('The task title'),
      }),
      execute: async ({ tourId, dateId, title }: { tourId: string; dateId: string; title: string }) => {
        if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
          return { error: 'You do not have access to this date.' };
        }
        const task = await prisma.tourDateTask.create({
          data: { tourDateId: dateId, title },
          select: { id: true, title: true, done: true },
        });
        return { success: true, task };
      },
    });

    tools.update_task = tool({
      description: 'Update a task on a tour date (mark done/undone, rename).',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        taskId: z.string().describe('The task ID'),
        done: z.boolean().optional().describe('Mark task done or undone'),
        title: z.string().optional().describe('New title for the task'),
      }),
      execute: async ({ tourId, dateId, taskId, done, title }: { tourId: string; dateId: string; taskId: string; done?: boolean; title?: string }) => {
        if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
          return { error: 'You do not have access to this date.' };
        }
        const data: Record<string, unknown> = {};
        if (done !== undefined) data.done = done;
        if (title !== undefined) data.title = title;
        if (Object.keys(data).length === 0) return { error: 'Nothing to update.' };
        const task = await prisma.tourDateTask.update({
          where: { id: taskId },
          data,
          select: { id: true, title: true, done: true },
        });
        return { success: true, task };
      },
    });

    tools.delete_task = tool({
      description: 'Delete a task from a tour date checklist.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        taskId: z.string().describe('The task ID to delete'),
      }),
      execute: async ({ tourId, dateId, taskId }: { tourId: string; dateId: string; taskId: string }) => {
        if (!(await userCanOpenTourDateDetail(userId, role, tourId, dateId))) {
          return { error: 'You do not have access to this date.' };
        }
        const task = await prisma.tourDateTask.findFirst({ where: { id: taskId, tourDateId: dateId } });
        if (!task) return { error: 'Task not found.' };
        await prisma.tourDateTask.delete({ where: { id: taskId } });
        return { success: true, deleted: task.title };
      },
    });

    tools.update_advance = tool({
      description: 'Update advance information for a tour date (technical, rider, logistics, equipment). Can update text content and done/compromises status.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        technicalInfo: z.string().optional().describe('Technical info text'),
        technicalDone: z.boolean().optional(),
        technicalCompromises: z.boolean().optional(),
        rider: z.string().optional().describe('Rider/catering text'),
        riderDone: z.boolean().optional(),
        riderCompromises: z.boolean().optional(),
        logistics: z.string().optional().describe('Logistics text'),
        logisticsDone: z.boolean().optional(),
        logisticsCompromises: z.boolean().optional(),
        equipmentTransport: z.string().optional().describe('Equipment transport text'),
        equipmentTransportDone: z.boolean().optional(),
        equipmentTransportCompromises: z.boolean().optional(),
      }),
      execute: async (input: { tourId: string; dateId: string; [key: string]: unknown }) => {
        const { tourId, dateId, ...fields } = input;
        if (!(await userCanOpenTourDateDetail(userId, role, tourId as string, dateId as string))) {
          return { error: 'You do not have access to this date.' };
        }
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v !== undefined) data[k] = v;
        }
        if (Object.keys(data).length === 0) return { error: 'Nothing to update.' };
        const advance = await prisma.advance.upsert({
          where: { tourDateId: dateId as string },
          create: { tourDateId: dateId as string, ...data },
          update: data,
        });
        return { success: true, id: advance.id };
      },
    });
  }

  // ===========================================================================
  // WRITE TOOLS — full catalog (admin/editor/superadmin): schedule, transport, hotels, guest list, tour dates
  // ===========================================================================

  if (isFullCatalog) {
    tools.add_schedule_item = tool({
      description: 'Add a schedule item (e.g. soundcheck, doors, show) to a tour date day sheet.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        time: z.string().describe('Time in HH:MM format, e.g. "14:00"'),
        label: z.string().describe('Label, e.g. "Soundcheck", "Doors", "Show"'),
        endTime: z.string().optional().describe('End time in HH:MM format'),
        notes: z.string().optional(),
        dayAfter: z.boolean().optional().describe('True if the time is after midnight (next calendar day)'),
      }),
      execute: async ({ tourId, dateId, time, label, endTime, notes, dayAfter }: { tourId: string; dateId: string; time: string; label: string; endTime?: string; notes?: string; dayAfter?: boolean }) => {
        const td = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
        if (!td) return { error: 'Tour date not found.' };
        const maxSort = await prisma.scheduleItem.aggregate({ where: { tourDateId: dateId }, _max: { sortOrder: true } });
        const item = await prisma.scheduleItem.create({
          data: {
            tourDateId: dateId, time, label,
            endTime: endTime ?? null,
            notes: notes ?? null,
            dayAfter: dayAfter ?? false,
            sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          },
          select: { id: true, time: true, label: true, endTime: true, notes: true, dayAfter: true },
        });
        return { success: true, item };
      },
    });

    tools.apply_schedule_template = tool({
      description: 'Apply a day-sheet template to a tour date, appending schedule items from the template. Use get_schedule_templates first to find available templates.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        templateId: z.string().describe('The template ID to apply'),
      }),
      execute: async ({ tourId, dateId, templateId }: { tourId: string; dateId: string; templateId: string }) => {
        const td = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
        if (!td) return { error: 'Tour date not found.' };
        const template = await prisma.daySheetTemplate.findUnique({
          where: { id: templateId },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        });
        if (!template) return { error: 'Template not found.' };
        const maxSort = await prisma.scheduleItem.aggregate({ where: { tourDateId: dateId }, _max: { sortOrder: true } });
        let nextSort = (maxSort._max.sortOrder ?? 0) + 1;
        const created = await Promise.all(
          template.items.map((item) =>
            prisma.scheduleItem.create({
              data: {
                tourDateId: dateId,
                time: item.time,
                endTime: item.endTime,
                durationMinutes: item.durationMinutes,
                label: item.label,
                notes: item.notes,
                dayAfter: item.dayAfter,
                sortOrder: nextSort++,
              },
              select: { time: true, label: true },
            })
          )
        );
        return { success: true, itemsAdded: created.length, items: created };
      },
    });

    tools.get_schedule_templates = tool({
      description: 'List available day-sheet templates (global and tour-specific).',
      inputSchema: z.object({
        tourId: z.string().optional().describe('Optional tour ID to include tour-specific templates'),
      }),
      execute: async ({ tourId }: { tourId?: string }) => {
        const where = tourId
          ? { OR: [{ tourId: null }, { tourId }] }
          : { tourId: null };
        const templates = await prisma.daySheetTemplate.findMany({
          where,
          select: {
            id: true, name: true, tourId: true,
            items: { orderBy: { sortOrder: 'asc' }, select: { time: true, label: true, endTime: true, dayAfter: true } },
          },
        });
        return templates;
      },
    });

    tools.add_transport = tool({
      description: 'Add ground transport (bus, car, pickup, etc.) to a tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        type: z.string().describe('Transport type: "bus", "car", "pickup", etc.'),
        time: z.string().describe('Departure time in HH:MM format'),
        dayAfter: z.boolean().optional().describe('True if after midnight'),
        driver: z.string().optional(),
        driverPhone: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ tourId, dateId, type, time, dayAfter, driver, driverPhone, company, notes }: { tourId: string; dateId: string; type: string; time: string; dayAfter?: boolean; driver?: string; driverPhone?: string; company?: string; notes?: string }) => {
        const td = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
        if (!td) return { error: 'Tour date not found.' };
        const transport = await prisma.transport.create({
          data: {
            tourDateId: dateId, type, time,
            dayAfter: dayAfter ?? false,
            driver: driver ?? null, driverPhone: driverPhone ?? null,
            company: company ?? null, notes: notes ?? null,
          },
          select: { id: true, type: true, time: true },
        });
        return { success: true, transport };
      },
    });

    tools.add_hotel = tool({
      description: 'Add a hotel booking to a tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        name: z.string().describe('Hotel name'),
        checkIn: z.string().describe('Check-in date/time ISO string, e.g. "2026-04-15T15:00"'),
        checkOut: z.string().describe('Check-out date/time ISO string'),
        address: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ tourId, dateId, name, checkIn, checkOut, address, notes }: { tourId: string; dateId: string; name: string; checkIn: string; checkOut: string; address?: string; notes?: string }) => {
        const td = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
        if (!td) return { error: 'Tour date not found.' };
        const hotel = await prisma.hotel.create({
          data: {
            tourDateId: dateId, name,
            checkIn: new Date(checkIn), checkOut: new Date(checkOut),
            address: address ?? null, notes: notes ?? null,
          },
          select: { id: true, name: true },
        });
        return { success: true, hotel };
      },
    });

    tools.add_guest_list_entry = tool({
      description: 'Add an entry to a tour date guest list.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        name: z.string().describe('Guest name'),
        ticketCount: z.number().optional().describe('Number of tickets (default 1)'),
        representing: z.string().optional().describe('Company, label, or act the guest represents'),
        phone: z.string().optional(),
      }),
      execute: async ({ tourId, dateId, name, ticketCount, representing, phone }: { tourId: string; dateId: string; name: string; ticketCount?: number; representing?: string; phone?: string }) => {
        const td = await prisma.tourDate.findFirst({ where: { id: dateId, tourId } });
        if (!td) return { error: 'Tour date not found.' };
        const entry = await prisma.tourDateGuestListEntry.create({
          data: {
            tourDateId: dateId, name,
            ticketCount: ticketCount ?? 1,
            representing: representing ?? null,
            phone: phone ?? null,
          },
          select: { id: true, name: true, ticketCount: true },
        });
        return { success: true, entry };
      },
    });

    tools.delete_schedule_item = tool({
      description: 'Delete a schedule item from a tour date day sheet. Use get_date_schedule first to find the item IDs.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        itemId: z.string().describe('The schedule item ID to delete'),
      }),
      execute: async ({ tourId, dateId, itemId }: { tourId: string; dateId: string; itemId: string }) => {
        const item = await prisma.scheduleItem.findFirst({ where: { id: itemId, tourDateId: dateId, tourDate: { tourId } } });
        if (!item) return { error: 'Schedule item not found.' };
        await prisma.scheduleItem.delete({ where: { id: itemId } });
        return { success: true, deleted: `${item.time} ${item.label}` };
      },
    });

    tools.delete_transport = tool({
      description: 'Delete a transport entry from a tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        transportId: z.string().describe('The transport ID to delete'),
      }),
      execute: async ({ tourId, dateId, transportId }: { tourId: string; dateId: string; transportId: string }) => {
        const t = await prisma.transport.findFirst({ where: { id: transportId, tourDateId: dateId, tourDate: { tourId } } });
        if (!t) return { error: 'Transport not found.' };
        await prisma.transport.delete({ where: { id: transportId } });
        return { success: true, deleted: `${t.type} at ${t.time}` };
      },
    });

    tools.delete_hotel = tool({
      description: 'Delete a hotel entry from a tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        hotelId: z.string().describe('The hotel ID to delete'),
      }),
      execute: async ({ tourId, dateId, hotelId }: { tourId: string; dateId: string; hotelId: string }) => {
        const h = await prisma.hotel.findFirst({ where: { id: hotelId, tourDateId: dateId, tourDate: { tourId } } });
        if (!h) return { error: 'Hotel not found.' };
        await prisma.hotel.delete({ where: { id: hotelId } });
        return { success: true, deleted: h.name };
      },
    });

    tools.delete_guest_list_entry = tool({
      description: 'Delete a guest list entry from a tour date.',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        entryId: z.string().describe('The guest list entry ID to delete'),
      }),
      execute: async ({ tourId, dateId, entryId }: { tourId: string; dateId: string; entryId: string }) => {
        const e = await prisma.tourDateGuestListEntry.findFirst({ where: { id: entryId, tourDateId: dateId, tourDate: { tourId } } });
        if (!e) return { error: 'Guest list entry not found.' };
        await prisma.tourDateGuestListEntry.delete({ where: { id: entryId } });
        return { success: true, deleted: e.name };
      },
    });

    tools.update_tour_date = tool({
      description: 'Update a tour date (status, notes, promoter info, venue details, kind, etc.).',
      inputSchema: z.object({
        tourId: z.string().describe('The tour ID'),
        dateId: z.string().describe('The tour date ID'),
        name: z.string().optional().describe('Custom label for the date'),
        venueName: z.string().optional(),
        city: z.string().optional(),
        status: z.string().optional().describe('confirmed, tbc, cancelled, pitch, opportunity, or lost_pitch'),
        kind: z.string().optional().describe('concert, event, travelday, preproduction, or rehearsal'),
        notes: z.string().optional().describe('Day notes'),
        promoterName: z.string().optional(),
        promoterPhone: z.string().optional(),
        promoterEmail: z.string().optional(),
        address: z.string().optional(),
      }),
      execute: async (input: { tourId: string; dateId: string; [key: string]: unknown }) => {
        const { tourId, dateId, ...fields } = input;
        const td = await prisma.tourDate.findFirst({ where: { id: dateId as string, tourId: tourId as string } });
        if (!td) return { error: 'Tour date not found.' };
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v !== undefined) data[k] = v;
        }
        if (Object.keys(data).length === 0) return { error: 'Nothing to update.' };
        await prisma.tourDate.update({ where: { id: dateId as string }, data });
        return { success: true, updated: Object.keys(data) };
      },
    });
  }

  return tools;
}
