import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';
import { EventStatus } from '@prisma/client';

export async function getEvents(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, status, page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status as EventStatus;
    else where.status = { in: [EventStatus.Upcoming, EventStatus.Ongoing] };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take,
        include: {
          organizer: { select: { fullName: true } },
          _count: { select: { registrations: true } }
        }
      }),
      prisma.event.count({ where })
    ]);

    sendSuccess(res, events, 'Events fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch events', 500);
  }
}

export async function getEventById(req: Request, res: Response): Promise<void> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { organizer: { select: { fullName: true } }, _count: { select: { registrations: true } } }
    });
    if (!event) { sendError(res, 'Event not found', 404); return; }
    sendSuccess(res, event);
  } catch {
    sendError(res, 'Failed to fetch event', 500);
  }
}

export async function registerForEvent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) { sendError(res, 'Student profile not found', 404); return; }

    const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { _count: { select: { registrations: true } } } });
    if (!event) { sendError(res, 'Event not found', 404); return; }
    if (event.maxCapacity && event._count.registrations >= event.maxCapacity) {
      sendError(res, 'Event is at full capacity', 400); return;
    }

    const reg = await prisma.eventRegistration.upsert({
      where: { eventId_studentId: { eventId: event.id, studentId: student.id } },
      update: {},
      create: { eventId: event.id, studentId: student.id }
    });

    // Notification
    await prisma.notification.create({
      data: { userId, text: `You have registered for ${event.title}`, type: 'event' }
    });

    sendSuccess(res, reg, 'Registered for event', 201);
  } catch {
    sendError(res, 'Failed to register for event', 500);
  }
}

export async function unregisterFromEvent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) { sendError(res, 'Student profile not found', 404); return; }

    await prisma.eventRegistration.delete({
      where: { eventId_studentId: { eventId: req.params.id, studentId: student.id } }
    });
    sendSuccess(res, null, 'Unregistered from event');
  } catch {
    sendError(res, 'Failed to unregister from event', 500);
  }
}
