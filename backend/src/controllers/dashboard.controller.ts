import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { department: true }
    });
    if (!student) { sendError(res, 'Student profile not found', 404); return; }

    // Stats
    const [assignmentCount, eventCount, noticeCount, attendanceCount, presentCount] = await Promise.all([
      prisma.assignment.count({ where: { course: { departmentId: student.departmentId }, status: 'Active' } }),
      prisma.event.count({ where: { status: { in: ['Upcoming', 'Ongoing'] } } }),
      prisma.notice.count({ where: { status: 'Published' } }),
      prisma.attendanceRecord.count({ where: { studentId: student.id } }),
      prisma.attendanceRecord.count({ where: { studentId: student.id, status: 'Present' } }),
    ]);

    const attendancePct = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0;

    // Recent notices
    const recentNotices = await prisma.notice.findMany({
      where: { status: 'Published' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { id: true, noticeId: true, title: true, category: true, priority: true, publishedAt: true }
    });

    // Upcoming events
    const upcomingEvents = await prisma.event.findMany({
      where: { status: { in: ['Upcoming', 'Ongoing'] }, startDate: { gte: new Date() } },
      orderBy: { startDate: 'asc' },
      take: 4,
      select: { id: true, title: true, category: true, startDate: true, venue: true }
    });

    // Recent activity (notifications)
    const recentActivity = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    sendSuccess(res, {
      student: { id: student.studentId, fullName: student.fullName, department: student.department.name, year: student.year, semester: student.semester },
      stats: {
        assignments: assignmentCount,
        events: eventCount,
        notices: noticeCount,
        attendance: attendancePct,
      },
      recentNotices,
      upcomingEvents,
      recentActivity,
    });
  } catch {
    sendError(res, 'Failed to fetch dashboard', 500);
  }
}

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) { sendError(res, 'Student not found', 404); return; }

    const [assignmentCount, noticeCount, eventCount, submissionCount] = await Promise.all([
      prisma.assignment.count({ where: { course: { departmentId: student.departmentId }, status: 'Active' } }),
      prisma.notice.count({ where: { status: 'Published' } }),
      prisma.event.count({ where: { status: { in: ['Upcoming', 'Ongoing'] } } }),
      prisma.assignmentSubmission.count({ where: { studentId: student.id } }),
    ]);

    sendSuccess(res, { assignments: assignmentCount, notices: noticeCount, events: eventCount, submissions: submissionCount });
  } catch {
    sendError(res, 'Failed to fetch stats', 500);
  }
}

export async function getDashboardActivity(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const [activities, total] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.notification.count({ where: { userId } })
    ]);

    sendSuccess(res, activities, 'Activity fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch activity', 500);
  }
}
