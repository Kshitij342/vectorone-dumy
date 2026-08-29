import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';

export async function getCalendarEvents(req: Request, res: Response): Promise<void> {
  try {
    const { month, year } = req.query as Record<string, string>;

    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const events = await prisma.calendarEvent.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    sendSuccess(res, events);
  } catch {
    sendError(res, 'Failed to fetch calendar events', 500);
  }
}
