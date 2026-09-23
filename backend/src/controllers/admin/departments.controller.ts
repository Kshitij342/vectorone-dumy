import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { DepartmentStatus } from '@prisma/client';

export async function getDepartments(req: Request, res: Response): Promise<void> {
  try {
    const { q, status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (status) {
      if (status === 'Under Review') where.status = DepartmentStatus.UnderReview;
      else if (status === 'Inactive') where.status = DepartmentStatus.Inactive;
      else if (status === 'Active') where.status = DepartmentStatus.Active;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { deptId: { contains: q, mode: 'insensitive' } },
        { hod: { contains: q, mode: 'insensitive' } },
      ];
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            students: true,
            faculty: true,
            courses: true,
          },
        },
      },
    });

    const formatted = departments.map((d) => {
      let statusStr = 'Active';
      if (d.status === DepartmentStatus.UnderReview) statusStr = 'Under Review';
      if (d.status === DepartmentStatus.Inactive) statusStr = 'Inactive';

      return {
        id: d.deptId,
        _id: d.id,
        name: d.name,
        hod: d.hod || '—',
        faculty: d._count.faculty,
        students: d._count.students,
        courses: d._count.courses,
        status: statusStr,
      };
    });

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch departments', 500);
  }
}

export async function getDepartmentById(req: Request, res: Response): Promise<void> {
  try {
    const d = await prisma.department.findFirst({
      where: { OR: [{ id: req.params.id }, { deptId: req.params.id }] },
      include: {
        _count: { select: { students: true, faculty: true, courses: true } },
      },
    });

    if (!d) {
      sendError(res, 'Department not found', 404);
      return;
    }

    let statusStr = 'Active';
    if (d.status === DepartmentStatus.UnderReview) statusStr = 'Under Review';
    if (d.status === DepartmentStatus.Inactive) statusStr = 'Inactive';

    sendSuccess(res, {
      id: d.deptId,
      _id: d.id,
      name: d.name,
      hod: d.hod || '—',
      faculty: d._count.faculty,
      students: d._count.students,
      courses: d._count.courses,
      status: statusStr,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch department', 500);
  }
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id, name, hod, status } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, 'Department name is required', 400);
      return;
    }

    let deptStatus: DepartmentStatus = DepartmentStatus.Active;
    if (status === 'Under Review') deptStatus = DepartmentStatus.UnderReview;
    if (status === 'Inactive') deptStatus = DepartmentStatus.Inactive;

    const count = await prisma.department.count();
    const targetDeptId = id && String(id).trim() ? String(id).trim() : `DEP-${100 + count + 1}`;

    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim(), mode: 'insensitive' } },
          { deptId: targetDeptId },
        ],
      },
    });

    if (existing) {
      const matchType = existing.name.toLowerCase() === name.trim().toLowerCase() ? 'name' : 'ID';
      sendError(res, `A department with this ${matchType} (${matchType === 'name' ? name.trim() : targetDeptId}) already exists`, 409);
      return;
    }

    const dept = await prisma.department.create({
      data: {
        deptId: targetDeptId,
        name: name.trim(),
        hod: hod ? String(hod).trim() : null,
        status: deptStatus,
      },
    });

    sendSuccess(res, dept, 'Department created successfully', 201);
  } catch (error) {
    console.error('VectorOne createDepartment Error:', error);
    sendError(res, 'Failed to create department', 500);
  }
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, hod, status } = req.body;

    const d = await prisma.department.findFirst({
      where: { OR: [{ id }, { deptId: id }] },
    });

    if (!d) {
      sendError(res, 'Department not found', 404);
      return;
    }

    let deptStatus: DepartmentStatus = d.status;
    if (status === 'Active') deptStatus = DepartmentStatus.Active;
    if (status === 'Under Review') deptStatus = DepartmentStatus.UnderReview;
    if (status === 'Inactive') deptStatus = DepartmentStatus.Inactive;

    const updated = await prisma.department.update({
      where: { id: d.id },
      data: {
        name: name !== undefined ? name : d.name,
        hod: hod !== undefined ? hod : d.hod,
        status: deptStatus,
      },
    });

    sendSuccess(res, updated, 'Department updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update department', 500);
  }
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const d = await prisma.department.findFirst({
      where: { OR: [{ id }, { deptId: id }] },
    });

    if (!d) {
      sendError(res, 'Department not found', 404);
      return;
    }

    const [sCount, fCount, cCount] = await Promise.all([
      prisma.student.count({ where: { departmentId: d.id } }),
      prisma.facultyMember.count({ where: { departmentId: d.id } }),
      prisma.course.count({ where: { departmentId: d.id } }),
    ]);

    if (sCount > 0 || fCount > 0 || cCount > 0) {
      const parts: string[] = [];
      if (sCount > 0) parts.push(`${sCount} student(s)`);
      if (fCount > 0) parts.push(`${fCount} faculty member(s)`);
      if (cCount > 0) parts.push(`${cCount} course(s)`);

      sendError(
        res,
        `Cannot delete department "${d.name}" because it currently has ${parts.join(', ')} assigned. Please reassign or remove them first.`,
        409
      );
      return;
    }

    await prisma.$transaction([
      prisma.resource.updateMany({ where: { departmentId: d.id }, data: { departmentId: null } }),
      prisma.department.delete({ where: { id: d.id } }),
    ]);

    sendSuccess(res, null, 'Department deleted successfully');
  } catch (error) {
    console.error('VectorOne deleteDepartment Error:', error);
    sendError(res, 'Failed to delete department', 500);
  }
}

