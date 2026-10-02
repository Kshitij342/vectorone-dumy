import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAnalyticsOverview(_req: Request, res: Response): Promise<void> {
  try {
    const [students, faculty, departments, courses, attendanceTotal, attendancePresent, attendanceLate, assignmentCount, eventCount, resourceDownloads] = await Promise.all([
      prisma.student.count(),
      prisma.facultyMember.count(),
      prisma.department.count(),
      prisma.course.count(),
      prisma.attendanceRecord.count(),
      prisma.attendanceRecord.count({ where: { status: 'Present' } }),
      prisma.attendanceRecord.count({ where: { status: 'Late' } }),
      prisma.assignment.count(),
      prisma.event.count(),
      prisma.resource.aggregate({ _sum: { downloadCount: true } }),
    ]);

    const attendanceTrend = attendanceTotal > 0 ? [attendancePresent, attendanceTotal - attendancePresent - attendanceLate, attendanceLate] : [];
    const studentGrowth = students > 0 ? [students] : [];
    const departmentDistribution = departments > 0 ? [departments] : [];
    const assignmentsStatus = assignmentCount > 0 ? [assignmentCount] : [];
    const eventsOverview = eventCount > 0 ? [eventCount] : [];
    const resourcesUsage = (resourceDownloads._sum.downloadCount ?? 0) > 0 ? [resourceDownloads._sum.downloadCount ?? 0] : [];
    const facultyDistribution = faculty > 0 ? [faculty] : [];

    sendSuccess(res, {
      students,
      faculty,
      departments,
      courses,
      charts: {
        attendanceTrend,
        studentGrowth,
        departmentDistribution,
        assignmentsStatus,
        eventsOverview,
        resourcesUsage,
        facultyDistribution,
      },
    });
  } catch (error) {
    sendError(res, 'Failed to fetch analytics overview', 500);
  }
}

export async function getStudentAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const total = await prisma.student.count();
    sendSuccess(res, {
      total,
      growthRate: '0%',
      enrollmentTrend: total > 0 ? [total] : [],
    });
  } catch (error) {
    sendError(res, 'Failed to fetch student analytics', 500);
  }
}

export async function getAttendanceAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const [total, present] = await Promise.all([
      prisma.attendanceRecord.count(),
      prisma.attendanceRecord.count({ where: { status: 'Present' } }),
    ]);

    const averageAttendance = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
    const weeklyTrend = total > 0 ? [present, total - present] : [];

    sendSuccess(res, {
      averageAttendance,
      weeklyTrend,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch attendance analytics', 500);
  }
}

export async function getEventAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const total = await prisma.event.count();
    sendSuccess(res, {
      monthlyEngagement: total > 0 ? [total] : [],
    });
  } catch (error) {
    sendError(res, 'Failed to fetch event analytics', 500);
  }
}

export async function getResourceAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const totals = await prisma.resource.aggregate({ _sum: { downloadCount: true } });
    const monthlyDownloads = totals._sum.downloadCount && totals._sum.downloadCount > 0 ? [totals._sum.downloadCount] : [];
    sendSuccess(res, {
      monthlyDownloads,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch resource analytics', 500);
  }
}
