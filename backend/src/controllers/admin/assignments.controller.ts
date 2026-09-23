import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { AssignmentStatus } from '@prisma/client';

export async function getAdminAssignments(req: Request, res: Response): Promise<void> {
  try {
    const { q, courseCode, status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as AssignmentStatus;
    if (courseCode) where.course = { courseCode };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { courseCode: true, name: true } },
        creator: { select: { fullName: true } },
        _count: { select: { submissions: true } },
      },
    });

    const formatted = assignments.map((a) => {
      const dateStr = a.dueDate.toISOString().split('T')[0];
      return {
        id: a.id,
        title: a.title,
        course: a.course.name,
        courseCode: a.course.courseCode,
        faculty: a.creator.fullName || 'Faculty Member',
        due: dateStr,
        dueDate: dateStr,
        submitted: a._count.submissions,
        total: a.totalMarks || 50,
        totalMarks: a.totalMarks,
        status: a.status === 'Active' ? 'Open' : (a.status || 'Open'),
        submissionsCount: a._count.submissions,
        creator: a.creator.fullName,
      };
    });

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch assignments', 500);
  }
}

export async function createAdminAssignment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const admin = await prisma.admin.findUnique({ where: { userId } });
    if (!admin) {
      sendError(res, 'Admin record not found', 404);
      return;
    }

    const { title, description, course, courseCode, due, dueDate, faculty, total, totalMarks, status } = req.body;
    const cSearch = courseCode || course;

    let courseRecord = await prisma.course.findFirst({
      where: { OR: [{ courseCode: cSearch }, { name: { contains: cSearch || '', mode: 'insensitive' } }] },
    });
    if (!courseRecord) courseRecord = await prisma.course.findFirst();

    const dVal = due || dueDate;
    const tVal = totalMarks || total;

    const assignment = await prisma.assignment.create({
      data: {
        title: title || 'New Assignment',
        description: description || '',
        dueDate: dVal ? new Date(dVal) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalMarks: tVal ? parseInt(String(tVal), 10) : 100,
        status: status === 'Open' ? AssignmentStatus.Active : (status as AssignmentStatus) || AssignmentStatus.Active,
        courseId: courseRecord ? courseRecord.id : '',
        creatorId: admin.id,
      },
    });

    sendSuccess(res, assignment, 'Assignment created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create assignment', 500);
  }
}

export async function getAdminAssignmentById(req: Request, res: Response): Promise<void> {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        course: true,
        creator: true,
        submissions: {
          include: {
            student: {
              include: { department: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      sendError(res, 'Assignment not found', 404);
      return;
    }

    const dateStr = assignment.dueDate.toISOString().split('T')[0];
    sendSuccess(res, {
      ...assignment,
      faculty: assignment.creator?.fullName || 'Faculty Member',
      due: dateStr,
      dueDate: dateStr,
      submitted: assignment.submissions.length,
      total: assignment.totalMarks || 50,
      course: assignment.course?.name || 'General',
    });
  } catch (error) {
    sendError(res, 'Failed to fetch assignment', 500);
  }
}

export async function updateAdminAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, due, dueDate, total, totalMarks, status } = req.body;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      sendError(res, 'Assignment not found', 404);
      return;
    }

    const dVal = due || dueDate;
    const tVal = totalMarks || total;

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        title: title !== undefined ? title : assignment.title,
        description: description !== undefined ? description : assignment.description,
        dueDate: dVal ? new Date(dVal) : assignment.dueDate,
        totalMarks: tVal ? parseInt(String(tVal), 10) : assignment.totalMarks,
        status: status ? (status === 'Open' ? AssignmentStatus.Active : (status as AssignmentStatus)) : assignment.status,
      },
    });

    sendSuccess(res, updated, 'Assignment updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update assignment', 500);
  }
}

export async function deleteAdminAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      sendError(res, 'Assignment not found', 404);
      return;
    }

    await prisma.$transaction([
      prisma.assignmentSubmission.deleteMany({ where: { assignmentId: id } }),
      prisma.assignment.delete({ where: { id } }),
    ]);

    sendSuccess(res, null, 'Assignment deleted successfully');
  } catch (error) {
    console.error('VectorOne deleteAdminAssignment Error:', error);
    sendError(res, 'Failed to delete assignment', 500);
  }
}
