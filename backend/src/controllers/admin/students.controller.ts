import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../../utils/paginate';
import { StudentStatus, Role } from '@prisma/client';

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const { q, department, year, division, semester, status, sort, limit, page } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const where: Record<string, unknown> = {};
    if (department) {
      where.department = { name: department };
    }
    if (year) where.year = parseInt(year, 10);
    if (division) where.division = division;
    if (semester) where.semester = parseInt(semester, 10);
    if (status) where.status = status as StudentStatus;

    if (q) {
      where.OR = [
        { studentId: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    let orderBy: Record<string, string> = { fullName: 'asc' };
    if (sort === 'id') orderBy = { studentId: 'asc' };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          department: true,
          user: { select: { email: true } },
          attendances: { select: { status: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    const formatted = students.map((s) => {
      const totalAtt = s.attendances.length;
      const presentAtt = s.attendances.filter((a) => a.status === 'Present').length;
      const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 95;

      return {
        id: s.studentId,
        _id: s.id,
        name: s.fullName,
        dept: s.department?.name || '',
        year: String(s.year),
        division: s.division,
        semester: String(s.semester),
        email: s.user.email,
        phone: s.phone || '',
        attendance: attRate,
        status: s.status,
      };
    });

    sendSuccess(res, formatted, 'Students fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    sendError(res, 'Failed to fetch students', 500);
  }
}

export async function getStudentById(req: Request, res: Response): Promise<void> {
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: req.params.id }, { studentId: req.params.id }],
      },
      include: {
        department: true,
        user: { select: { email: true } },
      },
    });

    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    sendSuccess(res, {
      id: student.studentId,
      _id: student.id,
      name: student.fullName,
      dept: student.department?.name || '',
      year: String(student.year),
      division: student.division,
      semester: String(student.semester),
      email: student.user.email,
      phone: student.phone || '',
      status: student.status,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch student details', 500);
  }
}

export async function createStudent(req: Request, res: Response): Promise<void> {
  try {
    const { id, name, dept, year, division, semester, email, phone, status } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      sendError(res, 'Email is already in use', 409);
      return;
    }

    let department = await prisma.department.findFirst({
      where: { name: { equals: dept, mode: 'insensitive' } },
    });
    if (!department) {
      department = await prisma.department.findFirst();
    }

    const passwordHash = await bcrypt.hash('Student@123', 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        student: {
          create: {
            studentId: id || `VO${Date.now().toString().slice(-7)}`,
            fullName: name,
            year: parseInt(year, 10) || 1,
            division: division || 'A',
            semester: parseInt(semester, 10) || 1,
            phone,
            status: (status as StudentStatus) || StudentStatus.Active,
            departmentId: department ? department.id : '',
          },
        },
        settings: { create: {} },
      },
      include: { student: { include: { department: true } } },
    });

    sendSuccess(res, user.student, 'Student created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create student', 500);
  }
}

export async function updateStudent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, dept, year, division, semester, email, phone, status } = req.body;

    const student = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentId: id }] },
      include: { user: true },
    });

    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    let departmentId = student.departmentId;
    if (dept) {
      const department = await prisma.department.findFirst({
        where: { name: { equals: dept, mode: 'insensitive' } },
      });
      if (department) departmentId = department.id;
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        fullName: name !== undefined ? name : student.fullName,
        year: year ? parseInt(year, 10) : student.year,
        division: division || student.division,
        semester: semester ? parseInt(semester, 10) : student.semester,
        phone: phone !== undefined ? phone : student.phone,
        status: status ? (status as StudentStatus) : student.status,
        departmentId,
      },
    });

    if (email && email !== student.user.email) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { email },
      });
    }

    sendSuccess(res, updated, 'Student updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update student', 500);
  }
}

export async function deleteStudent(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const student = await prisma.student.findFirst({
      where: { OR: [{ id }, { studentId: id }] },
      include: { user: true },
    });

    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    if (student.user?.role === Role.ADMIN) {
      sendError(res, 'Cannot delete an admin user', 403);
      return;
    }

    await prisma.message.deleteMany({ where: { senderId: student.userId } });
    await prisma.user.delete({ where: { id: student.userId } });
    sendSuccess(res, null, 'Student deleted successfully');
  } catch (error) {
    console.error('Error deleting student:', error);
    sendError(res, 'Failed to delete student', 500);
  }
}
