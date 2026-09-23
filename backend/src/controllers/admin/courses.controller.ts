import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { CourseStatus } from '@prisma/client';

export async function getCourses(req: Request, res: Response): Promise<void> {
  try {
    const { q, department, semester, year, status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (department) {
      where.department = { name: department };
    }
    if (semester) where.semester = parseInt(semester, 10);
    if (year) {
      const maxSem = parseInt(year, 10) * 2;
      where.semester = { lte: maxSem };
    }
    if (status) {
      if (status === 'Draft') where.status = CourseStatus.Draft;
      else if (status === 'Archived') where.status = CourseStatus.Archived;
      else if (status === 'Active') where.status = CourseStatus.Active;
    }

    if (q) {
      where.OR = [
        { courseCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { courseCode: 'asc' },
      include: {
        department: true,
        faculty: true,
        _count: { select: { attendances: true } },
      },
    });

    const studentCounts = await prisma.student.groupBy({
      by: ['departmentId'],
      _count: { id: true },
    });
    const deptStudentMap = new Map(studentCounts.map((sc) => [sc.departmentId, sc._count.id]));

    const formatted = courses.map((c) => {
      let statusStr = 'Active';
      if (c.status === CourseStatus.Draft) statusStr = 'Draft';
      if (c.status === CourseStatus.Archived) statusStr = 'Archived';

      return {
        code: c.courseCode,
        _id: c.id,
        name: c.name,
        department: c.department?.name || '',
        faculty: c.faculty?.fullName || 'Not assigned',
        semester: String(c.semester),
        credits: c.credits,
        students: deptStudentMap.get(c.departmentId) || 120,
        status: statusStr,
      };
    });

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch courses', 500);
  }
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  try {
    const c = await prisma.course.findFirst({
      where: { OR: [{ id: req.params.id }, { courseCode: req.params.id }] },
      include: { department: true, faculty: true },
    });

    if (!c) {
      sendError(res, 'Course not found', 404);
      return;
    }

    sendSuccess(res, {
      code: c.courseCode,
      _id: c.id,
      name: c.name,
      department: c.department?.name || '',
      faculty: c.faculty?.fullName || '',
      semester: String(c.semester),
      credits: c.credits,
      status: c.status,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch course', 500);
  }
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  try {
    const { code, name, department, faculty, semester, credits, status } = req.body;

    let deptRecord = await prisma.department.findFirst({
      where: { name: { equals: department, mode: 'insensitive' } },
    });
    if (!deptRecord) deptRecord = await prisma.department.findFirst();

    let facultyRecord = null;
    if (faculty) {
      facultyRecord = await prisma.facultyMember.findFirst({
        where: { fullName: { contains: faculty, mode: 'insensitive' } },
      });
    }

    let courseStatus: CourseStatus = CourseStatus.Active;
    if (status === 'Draft') courseStatus = CourseStatus.Draft;
    if (status === 'Archived') courseStatus = CourseStatus.Archived;

    const count = await prisma.course.count();
    const newCourse = await prisma.course.create({
      data: {
        courseCode: code || `CS${300 + count + 1}`,
        name,
        semester: semester ? parseInt(semester, 10) : 1,
        credits: credits ? parseInt(credits, 10) : 3,
        status: courseStatus,
        departmentId: deptRecord ? deptRecord.id : '',
        facultyId: facultyRecord ? facultyRecord.id : null,
      },
    });

    sendSuccess(res, newCourse, 'Course created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create course', 500);
  }
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, department, faculty, semester, credits, status } = req.body;

    const c = await prisma.course.findFirst({
      where: { OR: [{ id }, { courseCode: id }] },
    });

    if (!c) {
      sendError(res, 'Course not found', 404);
      return;
    }

    let departmentId = c.departmentId;
    if (department) {
      const deptRecord = await prisma.department.findFirst({
        where: { name: { equals: department, mode: 'insensitive' } },
      });
      if (deptRecord) departmentId = deptRecord.id;
    }

    let facultyId = c.facultyId;
    if (faculty) {
      const facultyRecord = await prisma.facultyMember.findFirst({
        where: { fullName: { contains: faculty, mode: 'insensitive' } },
      });
      if (facultyRecord) facultyId = facultyRecord.id;
    }

    let courseStatus: CourseStatus = c.status;
    if (status === 'Active') courseStatus = CourseStatus.Active;
    if (status === 'Draft') courseStatus = CourseStatus.Draft;
    if (status === 'Archived') courseStatus = CourseStatus.Archived;

    const updated = await prisma.course.update({
      where: { id: c.id },
      data: {
        name: name !== undefined ? name : c.name,
        semester: semester ? parseInt(semester, 10) : c.semester,
        credits: credits !== undefined ? parseInt(credits, 10) : c.credits,
        status: courseStatus,
        departmentId,
        facultyId,
      },
    });

    sendSuccess(res, updated, 'Course updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update course', 500);
  }
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const c = await prisma.course.findFirst({
      where: { OR: [{ id }, { courseCode: id }] },
    });

    if (!c) {
      sendError(res, 'Course not found', 404);
      return;
    }

    await prisma.assignment.deleteMany({ where: { courseId: c.id } });
    await prisma.resource.updateMany({
      where: { courseId: c.id },
      data: { courseId: null },
    });

    await prisma.course.delete({ where: { id: c.id } });
    sendSuccess(res, null, 'Course deleted successfully');
  } catch (error) {
    console.error('Error deleting course:', error);
    sendError(res, 'Failed to delete course', 500);
  }
}
