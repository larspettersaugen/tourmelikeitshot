const base = typeof window === 'undefined' ? '' : '';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${base}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json();
}

export const api = {
  projects: {
    list: () =>
      fetchApi<{ id: string; name: string; tourCount: number; owner: { id: string; name: string } | null }[]>('/projects'),
    get: (id: string) =>
      fetchApi<{
        id: string;
        name: string;
        owner: { id: string; name: string } | null;
        tours: { id: string; name: string; timezone: string; dateCount: number }[];
      }>(`/projects/${id}`),
    create: (body: { name: string; ownerId?: string | null }) =>
      fetchApi<{ id: string }>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; ownerId?: string | null }) =>
      fetchApi<{ id: string }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => fetchApi<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    createTour: (projectId: string, body: { name: string; startDate?: string; endDate?: string }) =>
      fetchApi<{ id: string }>(`/projects/${projectId}/tours`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  tours: {
    list: () => fetchApi<{ id: string; name: string; timezone: string }[]>('/tours'),
    get: (id: string) =>
      fetchApi<{
        id: string;
        name: string;
        timezone: string;
        startDate: string | null;
        endDate: string | null;
        manager: { id: string; name: string } | null;
        dates: {
          id: string;
          venueName: string;
          city: string;
          date: string;
          address: string | null;
          venueId?: string | null;
          name?: string | null;
        }[];
      }>(`/tours/${id}`),
    create: (body: { name: string; timezone?: string }) =>
      fetchApi<{ id: string }>('/tours', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; timezone?: string; startDate?: string; endDate?: string; managerId?: string | null }) =>
      fetchApi<{ ok: boolean }>(`/tours/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => fetchApi<{ ok: boolean }>(`/tours/${id}`, { method: 'DELETE' }),
  },
  dates: {
    list: (tourId: string) =>
      fetchApi<
        {
          id: string;
          venueName: string;
          city: string;
          date: string;
          endDate: string | null;
          kind?: string;
          status?: string;
          address: string | null;
          venueId?: string | null;
          name?: string | null;
        }[]
      >(`/tours/${tourId}/dates`),
    create: (
      tourId: string,
      body: {
        name?: string | null;
        venueName: string;
        city: string;
        date: string;
        endDate?: string;
        kind?: string;
        address?: string;
        timezone?: string;
        status?: string;
        venueId?: string;
      }
    ) => fetchApi<{ id: string }>(`/tours/${tourId}/dates`, { method: 'POST', body: JSON.stringify(body) }),
    update: (
      tourId: string,
      dateId: string,
      body: {
        venueName?: string;
        city?: string;
        date?: string;
        endDate?: string | null;
        kind?: string;
        status?: string;
        address?: string;
        timezone?: string;
        venueId?: string | null;
        name?: string | null;
        promoterName?: string | null;
        promoterPhone?: string | null;
        promoterEmail?: string | null;
        notes?: string;
        guestListCapacity?: number | null;
        guestListCapacityLocked?: boolean;
      }
    ) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (tourId: string, dateId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}`, { method: 'DELETE' }),
    setAdvanceComplete: (tourId: string, dateId: string, complete: boolean) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/advance-complete`, {
        method: 'POST',
        body: JSON.stringify({ complete }),
      }),
    dateMembers: {
      list: (tourId: string, dateId: string) =>
        fetchApi<{ memberIds: string[] }>(`/tours/${tourId}/dates/${dateId}/date-members`),
      set: (tourId: string, dateId: string, memberIds: string[]) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/date-members`, {
          method: 'PUT',
          body: JSON.stringify({ memberIds }),
        }),
    },
    guestList: {
      get: (tourId: string, dateId: string) =>
        fetchApi<{
          capacity: number | null;
          capacityLocked: boolean;
          entries: {
            id: string;
            name: string;
            ticketCount: number;
            representing: string | null;
            phone: string | null;
            sortOrder: number;
            createdAt: string;
          }[];
        }>(`/tours/${tourId}/dates/${dateId}/guest-list`),
      create: (
        tourId: string,
        dateId: string,
        body: { name: string; ticketCount?: number; representing?: string | null; phone?: string | null }
      ) =>
        fetchApi<{
          id: string;
          name: string;
          ticketCount: number;
          representing: string | null;
          phone: string | null;
          sortOrder: number;
          createdAt: string;
        }>(`/tours/${tourId}/dates/${dateId}/guest-list`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (
        tourId: string,
        dateId: string,
        entryId: string,
        body: {
          name?: string;
          ticketCount?: number;
          representing?: string | null;
          phone?: string | null;
          sortOrder?: number;
        }
      ) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/guest-list/${entryId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      delete: (tourId: string, dateId: string, entryId: string) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/guest-list/${entryId}`, {
          method: 'DELETE',
        }),
    },
    advance: {
      get: (tourId: string, dateId: string) =>
        fetchApi<{
          technicalInfo: string | null;
          rider: string | null;
          logistics: string | null;
          equipmentTransport: string | null;
          technicalDone: boolean;
          technicalCompromises: boolean;
          riderDone: boolean;
          riderCompromises: boolean;
          logisticsDone: boolean;
          logisticsCompromises: boolean;
          equipmentTransportDone: boolean;
          equipmentTransportCompromises: boolean;
          customFields: {
            id: string;
            title: string;
            body: string | null;
            done: boolean;
            compromises: boolean;
            sortOrder: number;
            createdAt: string;
            updatedAt: string;
          }[];
        }>(`/tours/${tourId}/dates/${dateId}/advance`),
      customFields: {
        create: (tourId: string, dateId: string, body?: { title?: string }) =>
          fetchApi<{
            id: string;
            title: string;
            body: string | null;
            done: boolean;
            compromises: boolean;
            sortOrder: number;
            createdAt: string;
            updatedAt: string;
          }>(`/tours/${tourId}/dates/${dateId}/advance/custom-fields`, {
            method: 'POST',
            body: JSON.stringify(body ?? {}),
          }),
        patch: (
          tourId: string,
          dateId: string,
          fieldId: string,
          body: {
            title?: string;
            body?: string | null;
            done?: boolean;
            compromises?: boolean;
            sortOrder?: number;
          }
        ) =>
          fetchApi<{
            id: string;
            title: string;
            body: string | null;
            done: boolean;
            compromises: boolean;
            sortOrder: number;
            createdAt: string;
            updatedAt: string;
          }>(`/tours/${tourId}/dates/${dateId}/advance/custom-fields/${fieldId}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          }),
        delete: (tourId: string, dateId: string, fieldId: string) =>
          fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/advance/custom-fields/${fieldId}`, {
            method: 'DELETE',
          }),
      },
      update: (
        tourId: string,
        dateId: string,
        body: {
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
        }
      ) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/advance`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      files: {
        list: (tourId: string, dateId: string) =>
          fetchApi<
            { id: string; filename: string; advanceSection: string | null; mimeType: string | null; sizeBytes: number | null; createdAt: string }[]
          >(`/tours/${tourId}/dates/${dateId}/advance/files`),
        upload: (
          tourId: string,
          dateId: string,
          file: File,
          advanceSection?: string | null
        ) => {
          const form = new FormData();
          form.append('file', file);
          if (advanceSection) form.append('advanceSection', advanceSection);
          return fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/advance/files`, {
            method: 'POST',
            body: form,
          });
        },
        delete: (tourId: string, dateId: string, fileId: string) =>
          fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/advance/files/${fileId}`, {
            method: 'DELETE',
          }),
      },
    },
    tasks: {
      list: (tourId: string, dateId: string) =>
        fetchApi<{ id: string; title: string; done: boolean; sortOrder: number; createdAt: string }[]>(
          `/tours/${tourId}/dates/${dateId}/tasks`
        ),
      create: (tourId: string, dateId: string, body: { title: string }) =>
        fetchApi<{ id: string; title: string; done: boolean; sortOrder: number; createdAt: string }>(
          `/tours/${tourId}/dates/${dateId}/tasks`,
          { method: 'POST', body: JSON.stringify(body) }
        ),
      update: (tourId: string, dateId: string, taskId: string, body: { title?: string; done?: boolean; sortOrder?: number }) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      delete: (tourId: string, dateId: string, taskId: string) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/tasks/${taskId}`, { method: 'DELETE' }),
    },
  },
  schedule: {
    list: (tourId: string, dateId: string) =>
      fetchApi<{ id: string; time: string; endTime?: string | null; durationMinutes?: number | null; label: string; notes: string | null; sortOrder: number; dayAfter?: boolean }[]>(
        `/tours/${tourId}/dates/${dateId}/schedule`
      ),
    create: (tourId: string, dateId: string, body: { time: string; label: string; notes?: string; sortOrder?: number; dayAfter?: boolean; endTime?: string; durationMinutes?: number }) =>
      fetchApi<{ id: string }>(`/tours/${tourId}/dates/${dateId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (
      tourId: string,
      dateId: string,
      itemId: string,
      body: { time?: string; label?: string; notes?: string; sortOrder?: number; dayAfter?: boolean; endTime?: string | null; durationMinutes?: number | null }
    ) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/schedule/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (tourId: string, dateId: string, itemId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/schedule/${itemId}`, { method: 'DELETE' }),
    applyTemplate: (tourId: string, dateId: string, templateId: string) =>
      fetchApi<{ ok: boolean; added: number }>(`/tours/${tourId}/dates/${dateId}/schedule/apply-template`, {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      }),
  },
  scheduleTemplates: {
    list: () =>
      fetchApi<
        {
          id: string;
          name: string;
          items: { time: string; endTime?: string | null; durationMinutes?: number | null; label: string; notes: string | null; sortOrder: number; dayAfter?: boolean }[];
        }[]
      >(`/schedule-templates`),
    create: (body: {
      name: string;
      items: { time: string; label: string; endTime?: string; durationMinutes?: number; notes?: string; sortOrder?: number; dayAfter?: boolean }[];
    }) =>
      fetchApi<{ id: string }>(`/schedule-templates`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (templateId: string, body: {
      name: string;
      items: { time: string; label: string; endTime?: string; durationMinutes?: number; notes?: string; sortOrder?: number; dayAfter?: boolean }[];
    }) =>
      fetchApi<{ ok: boolean }>(`/schedule-templates/${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (templateId: string) =>
      fetchApi<{ ok: boolean }>(`/schedule-templates/${templateId}`, { method: 'DELETE' }),
    duplicate: (templateId: string, body?: { name?: string }) =>
      fetchApi<{ id: string }>(`/schedule-templates/${templateId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
  },
  flights: {
    lookup: (params: { flight_number: string; date?: string }) => {
      const sp = new URLSearchParams({ flight_number: params.flight_number });
      if (params.date) sp.set('date', params.date);
      return fetchApi<{
        departureAirport: string;
        arrivalAirport: string;
        departureTime: string | null;
        arrivalTime: string | null;
        flightNumber: string;
      }>(`/flights/lookup?${sp.toString()}`);
    },
    list: (tourId: string) =>
      fetchApi<
        {
          id: string;
          tourDateId: string | null;
          departureTime: string;
          arrivalTime: string;
          departureAirport: string;
          arrivalAirport: string;
          flightNumber: string | null;
          notes: string | null;
        }[]
      >(`/tours/${tourId}/flights`),
    create: (
      tourId: string,
      body: {
        tourDateId?: string;
        departureTime: string;
        arrivalTime: string;
        departureAirport: string;
        arrivalAirport: string;
        flightNumber?: string;
        notes?: string;
      }
    ) => fetchApi<{ id: string }>(`/tours/${tourId}/flights`, { method: 'POST', body: JSON.stringify(body) }),
    update: (tourId: string, flightId: string, body: Record<string, unknown>) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/flights/${flightId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (tourId: string, flightId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/flights/${flightId}`, { method: 'DELETE' }),
    passengers: {
      list: (tourId: string, flightId: string) =>
        fetchApi<{ id: string; travelGroupMemberId: string; name: string; role: string; bookingRef: string | null }[]>(
          `/tours/${tourId}/flights/${flightId}/passengers`
        ),
      add: (tourId: string, flightId: string, body: { travelGroupMemberId: string; bookingRef?: string }) =>
        fetchApi<{ id: string }>(`/tours/${tourId}/flights/${flightId}/passengers`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (tourId: string, flightId: string, passengerId: string, body: { bookingRef?: string }) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/flights/${flightId}/passengers/${passengerId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      remove: (tourId: string, flightId: string, passengerId: string) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/flights/${flightId}/passengers/${passengerId}`, {
          method: 'DELETE',
        }),
    },
  },
  transport: {
    list: (tourId: string, dateId: string) =>
      fetchApi<
        { id: string; type: string; time: string; dayAfter?: boolean; driver: string | null; driverPhone: string | null; driverEmail: string | null; company: string | null; notes: string | null }[]
      >(`/tours/${tourId}/dates/${dateId}/transport`),
    create: (
      tourId: string,
      dateId: string,
      body: { type: string; time: string; dayAfter?: boolean; driver?: string; driverPhone?: string; driverEmail?: string; company?: string; notes?: string }
    ) =>
      fetchApi<{ id: string }>(`/tours/${tourId}/dates/${dateId}/transport`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (tourId: string, dateId: string, transportId: string, body: Record<string, unknown>) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/transport/${transportId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (tourId: string, dateId: string, transportId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/transport/${transportId}`, { method: 'DELETE' }),
    passengers: {
      add: (tourId: string, dateId: string, transportId: string, body: { travelGroupMemberId: string }) =>
        fetchApi<{ id: string }>(`/tours/${tourId}/dates/${dateId}/transport/${transportId}/passengers`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      remove: (tourId: string, dateId: string, transportId: string, passengerId: string) =>
        fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/transport/${transportId}/passengers/${passengerId}`, {
          method: 'DELETE',
        }),
    },
  },
  hotel: {
    list: (tourId: string, dateId: string) =>
      fetchApi<
        {
          id: string;
          name: string;
          address: string | null;
          checkIn: string;
          checkOut: string;
          notes: string | null;
          guests: {
            id: string;
            travelGroupMemberId: string;
            name: string;
            role: string;
            personId: string | null;
            roomNumber: string | null;
          }[];
        }[]
      >(`/tours/${tourId}/dates/${dateId}/hotel`),
    create: (
      tourId: string,
      dateId: string,
      body: {
        name: string;
        address?: string;
        checkIn: string;
        checkOut: string;
        notes?: string;
      }
    ) =>
      fetchApi<{ id: string }>(`/tours/${tourId}/dates/${dateId}/hotel`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (tourId: string, dateId: string, hotelId: string, body: Record<string, unknown>) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/hotel/${hotelId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (tourId: string, dateId: string, hotelId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/dates/${dateId}/hotel/${hotelId}`, { method: 'DELETE' }),
    guests: {
      add: (
        tourId: string,
        dateId: string,
        hotelId: string,
        body: { travelGroupMemberId: string; roomNumber?: string }
      ) =>
        fetchApi<{ id: string }>(`/tours/${tourId}/dates/${dateId}/hotel/${hotelId}/guests`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (
        tourId: string,
        dateId: string,
        hotelId: string,
        guestId: string,
        body: { roomNumber?: string }
      ) =>
        fetchApi<{ ok: boolean }>(
          `/tours/${tourId}/dates/${dateId}/hotel/${hotelId}/guests/${guestId}`,
          { method: 'PATCH', body: JSON.stringify(body) }
        ),
      remove: (tourId: string, dateId: string, hotelId: string, guestId: string) =>
        fetchApi<{ ok: boolean }>(
          `/tours/${tourId}/dates/${dateId}/hotel/${hotelId}/guests/${guestId}`,
          { method: 'DELETE' }
        ),
    },
  },
  contacts: {
    list: (tourId: string, dateId?: string) =>
      fetchApi<
        {
          id: string;
          name: string;
          role: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          tourDateId: string | null;
        }[]
      >(dateId ? `/tours/${tourId}/contacts?dateId=${dateId}` : `/tours/${tourId}/contacts`),
    create: (
      tourId: string,
      body: {
        name: string;
        role: string;
        phone?: string;
        email?: string;
        notes?: string;
        tourDateId?: string;
        personId?: string;
        venueContactId?: string;
        /** When a new venue contact row is created, attach it to this saved venue */
        venueId?: string;
      }
    ) => fetchApi<{ id: string }>(`/tours/${tourId}/contacts`, { method: 'POST', body: JSON.stringify(body) }),
    update: (tourId: string, contactId: string, body: Record<string, unknown>) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/contacts/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (tourId: string, contactId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/contacts/${contactId}`, { method: 'DELETE' }),
  },
  venueContacts: {
    list: (params?: { q?: string; venueId?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      if (params?.venueId) sp.set('venueId', params.venueId);
      const qs = sp.toString();
      return fetchApi<
        {
          id: string;
          name: string;
          role: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          venueId: string | null;
          venue: { id: string; name: string; city: string } | null;
        }[]
      >(qs ? `/venue-contacts?${qs}` : '/venue-contacts');
    },
    create: (body: {
      name: string;
      role?: string;
      phone?: string;
      email?: string;
      notes?: string;
      venueId?: string | null;
    }) =>
      fetchApi<{
        id: string;
        name: string;
        role: string;
        phone: string | null;
        email: string | null;
        notes: string | null;
        venueId: string | null;
        venue: { id: string; name: string; city: string } | null;
      }>('/venue-contacts', { method: 'POST', body: JSON.stringify(body) }),
    update: (
      id: string,
      body: {
        name?: string;
        role?: string;
        phone?: string | null;
        email?: string | null;
        notes?: string | null;
        venueId?: string | null;
      }
    ) =>
      fetchApi<{
        id: string;
        name: string;
        role: string;
        phone: string | null;
        email: string | null;
        notes: string | null;
        venueId: string | null;
        venue: { id: string; name: string; city: string } | null;
      }>(`/venue-contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) => fetchApi<{ ok: boolean }>(`/venue-contacts/${id}`, { method: 'DELETE' }),
  },
  venues: {
    list: (params?: { q?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      const qs = sp.toString();
      return fetchApi<
        {
          id: string;
          category: 'venue' | 'festival';
          name: string;
          city: string;
          address: string | null;
          capacity: number | null;
          notes: string | null;
          loadInNotes: string | null;
          cateringNotes: string | null;
          accessNotes: string | null;
        }[]
      >(qs ? `/venues?${qs}` : '/venues');
    },
    get: (id: string) =>
      fetchApi<{
        id: string;
        category: 'venue' | 'festival';
        name: string;
        city: string;
        address: string | null;
        capacity: number | null;
        notes: string | null;
        loadInNotes: string | null;
        cateringNotes: string | null;
        accessNotes: string | null;
      }>(`/venues/${id}`),
    create: (body: {
      name: string;
      city: string;
      category?: 'venue' | 'festival';
      address?: string;
      capacity?: number | null;
      notes?: string;
      loadInNotes?: string;
      cateringNotes?: string;
      accessNotes?: string;
    }) =>
      fetchApi<{
        id: string;
        category: 'venue' | 'festival';
        name: string;
        city: string;
        address: string | null;
        capacity: number | null;
        notes: string | null;
        loadInNotes: string | null;
        cateringNotes: string | null;
        accessNotes: string | null;
      }>('/venues', { method: 'POST', body: JSON.stringify(body) }),
    update: (
      id: string,
      body: {
        category?: 'venue' | 'festival';
        name?: string;
        city?: string;
        address?: string | null;
        capacity?: number | null;
        notes?: string | null;
        loadInNotes?: string | null;
        cateringNotes?: string | null;
        accessNotes?: string | null;
      }
    ) =>
      fetchApi<{
        id: string;
        category: 'venue' | 'festival';
        name: string;
        city: string;
        address: string | null;
        capacity: number | null;
        notes: string | null;
        loadInNotes: string | null;
        cateringNotes: string | null;
        accessNotes: string | null;
      }>(`/venues/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => fetchApi<{ ok: boolean }>(`/venues/${id}`, { method: 'DELETE' }),
  },
  people: {
    list: (params?: { type?: string; q?: string }) => {
      const sp = new URLSearchParams();
      if (params?.type) sp.set('type', params.type);
      if (params?.q) sp.set('q', params.q);
      const qs = sp.toString();
      return       fetchApi<
        {
          id: string;
          firstName: string;
          middleName: string | null;
          lastName: string;
          name: string;
          type: string;
          birthdate: string | null;
          phone: string | null;
          email: string | null;
          streetName: string | null;
          zipCode: string | null;
          county: string | null;
          timezone: string | null;
          notes: string | null;
          userId: string | null;
          isBookingAdmin?: boolean;
          isPowerUser?: boolean;
          linkedRoleLocked?: boolean;
          hasPendingInvite?: boolean;
        }[]
      >(qs ? `/people?${qs}` : '/people');
    },
    create: (body: {
        firstName: string;
        middleName?: string;
        lastName: string;
        type: string;
        email: string;
        birthdate?: string;
        phone?: string;
        streetName?: string;
        zipCode?: string;
        county?: string;
        timezone?: string;
        notes?: string;
        isBookingAdmin?: boolean;
        isPowerUser?: boolean;
      }) =>
      fetchApi<{
        id: string;
        name: string;
        type: string;
        phone: string | null;
        email: string | null;
        notes: string | null;
        inviteUrl?: string;
      }>('/people', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { firstName?: string; middleName?: string | null; lastName?: string; name?: string; type?: string; birthdate?: string | null; phone?: string | null; email?: string | null; streetName?: string | null; zipCode?: string | null; county?: string | null; timezone?: string | null; notes?: string | null; userId?: string; isBookingAdmin?: boolean; isPowerUser?: boolean }) =>
      fetchApi<{ id: string; firstName: string; middleName: string | null; lastName: string; name: string; type: string; phone: string | null; email: string | null; notes: string | null }>(
        `/people/${id}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      ),
    invite: (personId: string, body?: { isBookingAdmin?: boolean; isPowerUser?: boolean }) =>
      fetchApi<{ inviteUrl: string }>(`/people/${personId}/invite`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    revokeInvite: (personId: string) =>
      fetchApi<{ revoked: number }>(`/people/${personId}/invite`, { method: 'DELETE' }),
    delete: (id: string) => fetchApi<{ ok: boolean }>(`/people/${id}`, { method: 'DELETE' }),
  },
  me: {
    profile: {
      get: () =>
        fetchApi<{
          id: string;
          name: string;
          type: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
        } | null>('/me/profile'),
      create: (body: { name: string; type: string; phone?: string; email?: string; notes?: string }) =>
        fetchApi<{ id: string; name: string; type: string; phone: string | null; email: string | null; notes: string | null }>(
          '/me/profile',
          { method: 'POST', body: JSON.stringify(body) }
        ),
      link: (personId: string) =>
        fetchApi<{ id: string; linked: boolean }>('/me/profile', {
          method: 'POST',
          body: JSON.stringify({ personId }),
        }),
      update: (body: { name?: string; type?: string; phone?: string; email?: string; notes?: string }) =>
        fetchApi<{ id: string; name: string; type: string; phone: string | null; email: string | null; notes: string | null }>(
          '/me/profile',
          { method: 'PATCH', body: JSON.stringify(body) }
        ),
      unlink: () => fetchApi<{ ok: boolean }>('/me/profile', { method: 'DELETE' }),
    },
  },
  groups: {
    list: () =>
      fetchApi<{ id: string; name: string; memberCount: number }[]>('/groups'),
    get: (id: string) =>
      fetchApi<{
        id: string;
        name: string;
        members: {
          id: string;
          personId: string;
          name: string;
          type: string;
          phone: string | null;
          email: string | null;
          role: string;
          subgroup: string | null;
        }[];
      }>(`/groups/${id}`),
    create: (body: { name: string }) =>
      fetchApi<{ id: string; name: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: { name: string }) =>
      fetchApi<{ id: string; name: string }>(`/groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) => fetchApi<{ ok: boolean }>(`/groups/${id}`, { method: 'DELETE' }),
    addMember: (groupId: string, body: { personId: string; role?: string; subgroup?: string }) =>
      fetchApi<{ id: string; personId: string; name: string; type: string; phone: string | null; email: string | null; role: string; subgroup: string | null }>(
        `/groups/${groupId}/members`,
        { method: 'POST', body: JSON.stringify(body) }
      ),
    updateMember: (groupId: string, personId: string, body: { subgroup: string | null }) =>
      fetchApi<{ id: string; subgroup: string | null }>(`/groups/${groupId}/members/${personId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    removeMember: (groupId: string, personId: string) =>
      fetchApi<{ ok: boolean }>(`/groups/${groupId}/members/${personId}`, { method: 'DELETE' }),
  },
  travelingGroup: {
    list: (tourId: string) =>
      fetchApi<
        {
          id: string;
          name: string;
          role: string;
          subgroup: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
        }[]
      >(`/tours/${tourId}/traveling-group`),
    create: (
      tourId: string,
      body: { name: string; role: string; subgroup?: string; phone?: string; email?: string; notes?: string; personId?: string }
    ) =>
      fetchApi<{ id: string }>(`/tours/${tourId}/traveling-group`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (tourId: string, memberId: string, body: Record<string, unknown>) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/traveling-group/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (tourId: string, memberId: string) =>
      fetchApi<{ ok: boolean }>(`/tours/${tourId}/traveling-group/${memberId}`, { method: 'DELETE' }),
  },
};
