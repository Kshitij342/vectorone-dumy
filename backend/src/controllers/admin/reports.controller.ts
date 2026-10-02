import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getStudentsReport(_req: Request, res: Response): Promise<void> {
  try {
    const [byDept, byYear, byStatus, total] = await Promise.all([
      prisma.student.groupBy({ by: ['departmentId'], _count: { id: true } }),
      prisma.student.groupBy({ by: ['year'], _count: { id: true } }),
      prisma.student.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.student.count(),
    ]);

    const departments = await prisma.department.findMany();
    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    sendSuccess(res, {
      total,
      byDepartment: byDept.map((d) => ({ department: deptMap.get(d.departmentId) || 'Unknown', count: d._count.id })),
      byYear: byYear.map((y) => ({ year: `Year ${y.year}`, count: y._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    });
  } catch (error) {
    sendError(res, 'Failed to generate students report', 500);
  }
}

export async function getAttendanceReport(_req: Request, res: Response): Promise<void> {
  try {
    const [present, absent, late, total] = await Promise.all([
      prisma.attendanceRecord.count({ where: { status: 'Present' } }),
      prisma.attendanceRecord.count({ where: { status: 'Absent' } }),
      prisma.attendanceRecord.count({ where: { status: 'Late' } }),
      prisma.attendanceRecord.count(),
    ]);

    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

    sendSuccess(res, {
      totalRecords: total,
      present,
      absent,
      late,
      attendanceRate: `${rate}%`,
    });
  } catch (error) {
    sendError(res, 'Failed to generate attendance report', 500);
  }
}

export async function getAssignmentsReport(_req: Request, res: Response): Promise<void> {
  try {
    const [totalAssignments, totalSubmissions, active] = await Promise.all([
      prisma.assignment.count(),
      prisma.assignmentSubmission.count(),
      prisma.assignment.count({ where: { status: 'Active' } }),
    ]);

    const submissionRate = totalAssignments > 0 ? `${Math.round((totalSubmissions / totalAssignments) * 100)}%` : '0%';

    sendSuccess(res, {
      totalAssignments,
      totalSubmissions,
      activeAssignments: active,
      submissionRate,
    });
  } catch (error) {
    sendError(res, 'Failed to generate assignments report', 500);
  }
}

export async function getEventsReport(_req: Request, res: Response): Promise<void> {
  try {
    const [totalEvents, upcomingEvents, totalRegistrations] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'Upcoming' } }),
      prisma.eventRegistration.count(),
    ]);

    sendSuccess(res, {
      totalEvents,
      upcomingEvents,
      totalRegistrations,
      averageParticipation: totalEvents > 0 ? Math.round(totalRegistrations / totalEvents) : 0,
    });
  } catch (error) {
    sendError(res, 'Failed to generate events report', 500);
  }
}

export async function getResourcesReport(_req: Request, res: Response): Promise<void> {
  try {
    const [totalResources, byType, downloadsAggregate] = await Promise.all([
      prisma.resource.count(),
      prisma.resource.groupBy({ by: ['type'], _count: { id: true } }),
      prisma.resource.aggregate({ _sum: { downloadCount: true } }),
    ]);

    sendSuccess(res, {
      totalResources,
      totalDownloads: downloadsAggregate._sum.downloadCount ?? 0,
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
    });
  } catch (error) {
    sendError(res, 'Failed to generate resources report', 500);
  }
}

export async function getAdminReportsOverview(_req: Request, res: Response): Promise<void> {
  try {
    const [studentCount, facultyCount, deptCount, courseCount, assignmentCount, resourceCount, attendanceTotal, attendancePresent] = await Promise.all([
      prisma.student.count(),
      prisma.facultyMember.count(),
      prisma.department.count(),
      prisma.course.count(),
      prisma.assignment.count(),
      prisma.resource.count(),
      prisma.attendanceRecord.count(),
      prisma.attendanceRecord.count({ where: { status: 'Present' } }),
    ]);

    const complianceScore = attendanceTotal > 0 ? `${((attendancePresent / attendanceTotal) * 100).toFixed(1)}%` : '0%';

    const reports = [
      {
        id: 'RPT-01',
        title: 'Student Enrollment Summary',
        summary: 'Current student, department and course totals from the live database.',
        category: 'Academic',
        owner: 'Admissions Office',
        period: 'Current',
        updated: new Date().toISOString().slice(0, 10),
        status: 'Ready',
        metrics: [
          { label: 'Total Students', value: String(studentCount) },
          { label: 'Departments', value: String(deptCount) },
          { label: 'Courses', value: String(courseCount) },
        ],
      },
      {
        id: 'RPT-02',
        title: 'Faculty Profile Summary',
        summary: 'Current faculty records and departmental coverage.',
        category: 'Operations',
        owner: 'Academic Affairs',
        period: 'Current',
        updated: new Date().toISOString().slice(0, 10),
        status: 'Ready',
        metrics: [
          { label: 'Faculty Count', value: String(facultyCount) },
          { label: 'Departments', value: String(deptCount) },
          { label: 'Courses', value: String(courseCount) },
        ],
      },
      {
        id: 'RPT-03',
        title: 'Attendance Compliance',
        summary: 'Present attendance percentage based on live attendance records.',
        category: 'Academic',
        owner: 'Student Services',
        period: 'Current',
        updated: new Date().toISOString().slice(0, 10),
        status: 'Ready',
        metrics: [
          { label: 'Overall Rate', value: complianceScore },
          { label: 'Total Records', value: String(attendanceTotal) },
          { label: 'Present Count', value: String(attendancePresent) },
        ],
      },
      {
        id: 'RPT-04',
        title: 'Resource Inventory',
        summary: 'Current count of uploaded resources and downloadable assets.',
        category: 'Operations',
        owner: 'Administration',
        period: 'Current',
        updated: new Date().toISOString().slice(0, 10),
        status: 'Ready',
        metrics: [
          { label: 'Total Resources', value: String(resourceCount) },
          { label: 'Assignments', value: String(assignmentCount) },
          { label: 'Courses', value: String(courseCount) },
        ],
      },
    ];

    const totalReports = reports.length;
    const readyReports = reports.filter((r) => r.status === 'Ready').length;
    const stats = [
      { label: 'System Reports', value: String(totalReports), trend: 'Generated from DB', tone: 'blue' },
      { label: 'Ready to View', value: String(readyReports), trend: 'Live records only', tone: 'green' },
      { label: 'Data Source', value: 'PostgreSQL', trend: 'Current snapshot', tone: 'purple' },
      { label: 'Compliance Score', value: complianceScore, trend: attendanceTotal > 0 ? 'Verified from attendance' : 'No attendance data', tone: 'orange' },
    ];

    sendSuccess(res, reports, undefined, 200, { stats });
  } catch (error) {
    sendError(res, 'Failed to fetch admin reports overview', 500);
  }
}

