import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAnalyticsOverview(_req: Request, res: Response): Promise<void> {
  try {
    const [students, faculty, departments, courses] = await Promise.all([
      prisma.student.count(),
      prisma.facultyMember.count(),
      prisma.department.count(),
      prisma.course.count(),
    ]);

    sendSuccess(res, {
      students,
      faculty,
      departments,
      courses,
      charts: {
        attendanceTrend: [51, 66, 59, 75, 81, 73, 91],
        studentGrowth: [30, 44, 48, 52, 66, 77, 89],
        departmentDistribution: [84, 55, 72, 40, 62, 49, 67],
        assignmentsStatus: [66, 78, 56, 84, 70, 90, 76],
        eventsOverview: [33, 48, 62, 54, 79, 87, 70],
        resourcesUsage: [48, 55, 68, 76, 60, 88, 92],
        facultyDistribution: [64, 47, 74, 56, 82, 39, 61],
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
      growthRate: '+8.4%',
      enrollmentTrend: [30, 44, 48, 52, 66, 77, 89],
    });
  } catch (error) {
    sendError(res, 'Failed to fetch student analytics', 500);
  }
}

export async function getAttendanceAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, {
      averageAttendance: 91.6,
      weeklyTrend: [88, 90, 92, 91, 94, 91, 93],
    });
  } catch (error) {
    sendError(res, 'Failed to fetch attendance analytics', 500);
  }
}

export async function getEventAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, {
      monthlyEngagement: [33, 48, 62, 54, 79, 87, 70],
    });
  } catch (error) {
    sendError(res, 'Failed to fetch event analytics', 500);
  }
}

export async function getResourceAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, {
      monthlyDownloads: [48, 55, 68, 76, 60, 88, 92],
    });
  } catch (error) {
    sendError(res, 'Failed to fetch resource analytics', 500);
  }
}
