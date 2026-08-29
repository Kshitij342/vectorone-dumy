import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../../utils/paginate';
import { FacultyStatus, Role } from '@prisma/client';

export async function getFaculty(req: Request, res: Response): Promise<void> {
  try {
    const { q, department, designation, status, sort, page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const where: Record<string, unknown> = {};
    if (department) {
      where.department = { name: department };
    }
    if (designation) where.designation = designation;
    if (status) {
      if (status === 'On Leave') where.status = FacultyStatus.OnLeave;
      else if (status === 'Suspended') where.status = FacultyStatus.Suspended;
      else if (status === 'Active') where.status = FacultyStatus.Active;
    }

    if (q) {
      where.OR = [
        { facultyId: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    let orderBy: Record<string, string> = { fullName: 'asc' };
    if (sort === 'designation') orderBy = { designation: 'asc' };

    const [facultyList, total] = await Promise.all([
      prisma.facultyMember.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          department: true,
          user: { select: { email: true } },
          courses: { select: { name: true } },
        },
      }),
      prisma.facultyMember.count({ where }),
    ]);

    const formatted = facultyList.map((f) => {
      const courseList = f.courses.map((c) => c.name).join(', ') || 'No assigned courses';
      let statusStr = 'Active';
      if (f.status === FacultyStatus.OnLeave) statusStr = 'On Leave';
      if (f.status === FacultyStatus.Suspended) statusStr = 'Suspended';

      return {
        id: f.facultyId,
        _id: f.id,
        name: f.fullName,
        department: f.department?.name || '',
        designation: f.designation,
        email: f.user.email,
        phone: f.phone || '',
        courses: courseList,
        status: statusStr,
      };
    });

    sendSuccess(res, formatted, 'Faculty list fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    sendError(res, 'Failed to fetch faculty list', 500);
  }
}

export async function getFacultyById(req: Request, res: Response): Promise<void> {
  try {
    const f = await prisma.facultyMember.findFirst({
      where: { OR: [{ id: req.params.id }, { facultyId: req.params.id }] },
      include: {
        department: true,
        user: { select: { email: true } },
        courses: { select: { name: true } },
      },
    });

    if (!f) {
      sendError(res, 'Faculty member not found', 404);
      return;
    }

    let statusStr = 'Active';
    if (f.status === FacultyStatus.OnLeave) statusStr = 'On Leave';
    if (f.status === FacultyStatus.Suspended) statusStr = 'Suspended';

    sendSuccess(res, {
      id: f.facultyId,
      _id: f.id,
      name: f.fullName,
      department: f.department?.name || '',
      designation: f.designation,
      email: f.user.email,
      phone: f.phone || '',
      courses: f.courses.map((c) => c.name).join(', '),
      status: statusStr,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch faculty details', 500);
  }
}

export async function createFaculty(req: Request, res: Response): Promise<void> {
  try {
    const { id, name, department, designation, email, phone, status } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email already exists', 409);
      return;
    }

    let deptRecord = await prisma.department.findFirst({
      where: { name: { equals: department, mode: 'insensitive' } },
    });
    if (!deptRecord) deptRecord = await prisma.department.findFirst();

    let facultyStatus: FacultyStatus = FacultyStatus.Active;
    if (status === 'On Leave') facultyStatus = FacultyStatus.OnLeave;
    if (status === 'Suspended') facultyStatus = FacultyStatus.Suspended;

    const passwordHash = await bcrypt.hash('Faculty@123', 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.FACULTY,
        faculty: {
          create: {
            facultyId: id || `FAC-${Date.now().toString().slice(-4)}`,
            fullName: name,
            designation: designation || 'Assistant Professor',
            phone,
            status: facultyStatus,
            departmentId: deptRecord ? deptRecord.id : '',
          },
        },
      },
      include: { faculty: true },
    });

    sendSuccess(res, user.faculty, 'Faculty created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create faculty member', 500);
  }
}

export async function updateFaculty(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, department, designation, email, phone, status } = req.body;

    const f = await prisma.facultyMember.findFirst({
      where: { OR: [{ id }, { facultyId: id }] },
      include: { user: true },
    });

    if (!f) {
      sendError(res, 'Faculty member not found', 404);
      return;
    }

    let departmentId = f.departmentId;
    if (department) {
      const deptRecord = await prisma.department.findFirst({
        where: { name: { equals: department, mode: 'insensitive' } },
      });
      if (deptRecord) departmentId = deptRecord.id;
    }

    let facultyStatus: FacultyStatus = f.status;
    if (status === 'Active') facultyStatus = FacultyStatus.Active;
    if (status === 'On Leave') facultyStatus = FacultyStatus.OnLeave;
    if (status === 'Suspended') facultyStatus = FacultyStatus.Suspended;

    const updated = await prisma.facultyMember.update({
      where: { id: f.id },
      data: {
        fullName: name !== undefined ? name : f.fullName,
        designation: designation || f.designation,
        phone: phone !== undefined ? phone : f.phone,
        status: facultyStatus,
        departmentId,
      },
    });

    if (email && email !== f.user.email) {
      await prisma.user.update({
        where: { id: f.userId },
        data: { email },
      });
    }

    sendSuccess(res, updated, 'Faculty updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update faculty member', 500);
  }
}

export async function deleteFaculty(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const f = await prisma.facultyMember.findFirst({
      where: { OR: [{ id }, { facultyId: id }] },
    });

    if (!f) {
      sendError(res, 'Faculty member not found', 404);
      return;
    }

    await prisma.user.delete({ where: { id: f.userId } });
    sendSuccess(res, null, 'Faculty member deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete faculty member', 500);
  }
}
