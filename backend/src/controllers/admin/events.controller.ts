import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { EventStatus } from '@prisma/client';

export async function getAdminEvents(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status as EventStatus;

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

    const formatted = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      category: e.category,
      venue: e.venue || 'Campus',
      date: e.startDate.toISOString().split('T')[0],
      status: e.status,
      registrations: e._count.registrations,
    }));

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch admin events', 500);
  }
}

export async function createAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const admin = await prisma.admin.findUnique({ where: { userId } });
    if (!admin) {
      sendError(res, 'Admin record not found', 404);
      return;
    }

    const { title, description, category, venue, date, maxCapacity, status } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description: description || '',
        category: category || 'General',
        venue: venue || 'Campus Auditorium',
        startDate: date ? new Date(date) : new Date(),
        maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        status: (status as EventStatus) || EventStatus.Upcoming,
        organizerId: admin.id,
      },
    });

    sendSuccess(res, event, 'Event created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create event', 500);
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
      },
    });

    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    sendSuccess(res, event);
  } catch (error) {
    sendError(res, 'Failed to fetch event', 500);
  }
}

export async function updateAdminEvent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, category, venue, date, status } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title : event.title,
        description: description !== undefined ? description : event.description,
        category: category || event.category,
        venue: venue !== undefined ? venue : event.venue,
        startDate: date ? new Date(date) : event.startDate,
        status: status ? (status as EventStatus) : event.status,
      },
    });

    sendSuccess(res, updated, 'Event updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update event', 500);
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
