import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { EventStatus } from '@prisma/client';

function mapStatusToEnum(status: string | undefined): EventStatus {
  if (!status) return EventStatus.Upcoming;
  const s = status.trim();
  if (s === 'Open' || s === 'Upcoming') return EventStatus.Upcoming;
  if (s === 'Ongoing') return EventStatus.Ongoing;
  if (s === 'Closed' || s === 'Completed') return EventStatus.Completed;
  if (s === 'Cancelled') return EventStatus.Cancelled;
  return EventStatus.Upcoming;
}

function mapEnumToStatus(status: EventStatus): string {
  if (status === EventStatus.Upcoming) return 'Upcoming';
  if (status === EventStatus.Ongoing) return 'Ongoing';
  if (status === EventStatus.Completed) return 'Completed';
  if (status === EventStatus.Cancelled) return 'Cancelled';
  return 'Upcoming';
}

function computeEventStatus(statusEnum: EventStatus, startDateIso?: string | Date | null, endDateIso?: string | Date | null): string {
  if (statusEnum === EventStatus.Cancelled) {
    return 'Cancelled';
  }

  if (startDateIso) {
    const start = new Date(startDateIso);
    const end = endDateIso ? new Date(endDateIso) : new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);

    if (now > endDay) {
      return 'Completed';
    } else if (now >= startDay && now <= endDay) {
      return 'Ongoing';
    } else if (startDay > today) {
      return 'Upcoming';
    }
  }

  return mapEnumToStatus(statusEnum);
}

function formatEvent(e: any) {
  const regCount = e._count?.registrations !== undefined ? e._count.registrations : (Array.isArray(e.registrations) ? e.registrations.length : 0);
  const calculatedStatus = computeEventStatus(e.status, e.startDate, e.endDate);

  return {
    id: e.id,
    title: e.title,
    summary: e.description || '',
    description: e.description || '',
    category: e.category || 'General',
    venue: e.venue || 'Campus',
    date: e.startDate ? new Date(e.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: calculatedStatus,
    coordinator: e.organizer?.fullName || 'Admin',
    registered: regCount,
    capacity: e.maxCapacity || 100,
  };
}

export async function getAdminEvents(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = mapStatusToEnum(status);

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        organizer: { select: { fullName: true } },
        _count: { select: { registrations: true } },
      },
    });

    const formatted = events.map(formatEvent);

    const totalEvents = formatted.length;
    const upcomingEvents = formatted.filter((e) => e.status === 'Upcoming' || e.status === 'Ongoing').length;
    const completedEvents = formatted.filter((e) => e.status === 'Completed').length;
    const totalRegs = formatted.reduce((sum, e) => sum + (e.registered || 0), 0);

    const stats = [
      { label: 'Total Events', value: String(totalEvents), trend: 'From database', tone: 'blue' },
      { label: 'Open / Upcoming', value: String(upcomingEvents), trend: 'Accepting entries', tone: 'green' },
      { label: 'Total Registrations', value: String(totalRegs), trend: 'In system', tone: 'purple' },
      { label: 'Completed', value: String(completedEvents), trend: 'Past events', tone: 'orange' },
    ];

    sendSuccess(res, formatted, undefined, 200, { stats });
  } catch (error) {
    sendError(res, 'Failed to fetch admin events', 500);
  }
}

export async function createAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    let admin = await prisma.admin.findUnique({ where: { userId } });
    if (!admin && req.user?.role === 'ADMIN') {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        try {
          admin = await prisma.admin.create({
            data: {
              userId,
              fullName: userExists.email ? userExists.email.split('@')[0] : 'System Administrator',
            },
          });
        } catch {
          // ignore creation race condition or error
        }
      }
    }

    if (!admin) {
      admin = await prisma.admin.findFirst();
    }

    if (!admin) {
      sendError(res, 'Admin record not found', 404);
      return;
    }

    const { title, summary, description, category, venue, date, capacity, maxCapacity, status } = req.body;
    const rawDate = date || req.body.startDate;

    if (!title || typeof title !== 'string' || !title.trim()) {
      sendError(res, 'Event title is required', 400);
      return;
    }

    const eventDesc = (summary || description || '').trim();
    const eventCap = capacity || maxCapacity ? parseInt(String(capacity || maxCapacity), 10) : 100;
    
    let startDate = new Date();
    if (rawDate && (typeof rawDate === 'string' || rawDate instanceof Date)) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: eventDesc,
        category: category || 'Workshop',
        venue: venue || 'Campus Auditorium',
        startDate,
        maxCapacity: isNaN(eventCap) ? 100 : eventCap,
        status: mapStatusToEnum(status),
        organizerId: admin.id,
      },
      include: {
        organizer: { select: { fullName: true } },
        _count: { select: { registrations: true } },
      },
    });

    sendSuccess(res, formatEvent(event), 'Event created successfully', 201);
  } catch (error: any) {
    sendError(res, error?.message || 'Failed to create event', 500);
  }
}

export async function getAdminEventById(req: Request, res: Response): Promise<void> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: { select: { fullName: true } },
        registrations: {
          include: {
            student: {
              include: { department: true },
            },
          },
        },
        _count: { select: { registrations: true } },
      },
    });

    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    sendSuccess(res, formatEvent(event));
  } catch (error) {
    sendError(res, 'Failed to fetch event', 500);
  }
}

export async function updateAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, summary, description, category, venue, date, capacity, maxCapacity, status } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    let startDate = event.startDate;
    const rawDate = date || req.body.startDate;
    if (rawDate && (typeof rawDate === 'string' || rawDate instanceof Date)) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }

    const eventDesc = summary !== undefined ? summary : (description !== undefined ? description : event.description);
    const fallbackCap = event.maxCapacity || 100;
    const eventCap = capacity || maxCapacity ? parseInt(String(capacity || maxCapacity), 10) : fallbackCap;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : event.title,
        description: eventDesc,
        category: category || event.category,
        venue: venue !== undefined ? venue : event.venue,
        startDate,
        maxCapacity: isNaN(eventCap) ? fallbackCap : eventCap,
        status: status ? mapStatusToEnum(status) : event.status,
      },
      include: {
        organizer: { select: { fullName: true } },
        _count: { select: { registrations: true } },
      },
    });

    sendSuccess(res, formatEvent(updated), 'Event updated successfully');
  } catch (error: any) {
    sendError(res, error?.message || 'Failed to update event', 500);
  }
}

export async function deleteAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    await prisma.event.delete({ where: { id } });
    sendSuccess(res, null, 'Event deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete event', 500);
  }
}
