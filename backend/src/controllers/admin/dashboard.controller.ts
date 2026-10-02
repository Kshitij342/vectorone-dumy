import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAdminDashboard(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalCourses,
      totalAssignments,
      totalResources,
      totalNotices,
      totalEvents,
      totalAttendance,
      presentAttendance,
      pendingStudents,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.facultyMember.count(),
      prisma.department.count(),
      prisma.course.count(),
      prisma.assignment.count(),
      prisma.resource.count(),
      prisma.notice.count(),
      prisma.event.count(),
      prisma.attendanceRecord.count(),
      prisma.attendanceRecord.count({ where: { status: 'Present' } }),
      prisma.student.count({ where: { status: 'Suspended' } }),
    ]);

    const attendancePct = totalAttendance > 0 ? Number(((presentAttendance / totalAttendance) * 100).toFixed(1)) : 0;

    const stats = [
      { label: 'Total Students', value: totalStudents, trend: totalStudents === 0 ? 'No students enrolled' : `${totalStudents} enrolled`, tone: 'blue' },
      { label: 'Total Faculty', value: totalFaculty, trend: totalFaculty === 0 ? 'No faculty records' : `${totalFaculty} faculty members`, tone: 'green' },
      { label: 'Departments', value: totalDepartments, trend: totalDepartments === 0 ? 'No departments' : `${totalDepartments} active departments`, tone: 'purple' },
      { label: 'Courses', value: totalCourses, trend: totalCourses === 0 ? 'No courses cataloged' : `${totalCourses} courses available`, tone: 'orange' },
      { label: 'Assignments', value: totalAssignments, trend: totalAssignments === 0 ? 'No assignments' : `${totalAssignments} assignments in system`, tone: 'blue' },
      { label: 'Resources', value: totalResources, trend: totalResources === 0 ? 'No resources uploaded' : `${totalResources} resources available`, tone: 'green' },
      { label: 'Notices', value: totalNotices, trend: totalNotices === 0 ? 'No notices published' : `${totalNotices} notices published`, tone: 'purple' },
      { label: 'Events', value: totalEvents, trend: totalEvents === 0 ? 'No upcoming events' : `${totalEvents} events scheduled`, tone: 'orange' },
      { label: 'Attendance %', value: attendancePct, suffix: '%', trend: totalAttendance === 0 ? 'No attendance logged' : `${attendancePct}% present`, tone: 'blue' },
      { label: 'Pending Approvals', value: pendingStudents, trend: pendingStudents === 0 ? 'No pending approvals' : `${pendingStudents} pending approvals`, tone: 'orange' },
    ];

    const recentStudents = await prisma.student.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { department: true },
    });

    const registrations = recentStudents.map((s) => ({
      name: s.fullName,
      meta: `${s.department?.name || 'Department'} · Year ${s.year}`,
      status: s.status === 'Active' ? 'Approved' : 'Pending',
    }));

    const recentNotices = await prisma.notice.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { title: true, createdAt: true },
    });

    const recentEvents = await prisma.event.findMany({
      take: 3,
      orderBy: { startDate: 'asc' },
      select: { title: true, startDate: true },
    });

    const notifications = await prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, {
      stats,
      registrations,
      notices: recentNotices.map((n) => n.title),
      events: recentEvents.map((e) => e.title),
      notifications: notifications.map((n) => n.text),
    });
  } catch (error) {
    sendError(res, 'Failed to fetch admin dashboard data', 500);
  }
}
