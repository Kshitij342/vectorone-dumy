import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';

export async function getAssignments(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) { sendError(res, 'Student not found', 404); return; }

    const { q, status, page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const where: Record<string, unknown> = {
      course: { departmentId: student.departmentId }
    };
    if (status) where.status = status;
    if (q) where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take,
        include: {
          course: { select: { courseCode: true, name: true } },
          _count: { select: { submissions: true } },
          submissions: {
            where: { studentId: student.id },
            select: { id: true, submittedAt: true, marksObtained: true }
          }
        }
      }),
      prisma.assignment.count({ where })
    ]);

    sendSuccess(res, assignments, 'Assignments fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch assignments', 500);
  }
}

export async function getAssignmentById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { courseCode: true, name: true } },
        submissions: student ? { where: { studentId: student.id } } : false,
        _count: { select: { submissions: true } }
      }
    });
    if (!assignment) { sendError(res, 'Assignment not found', 404); return; }
    sendSuccess(res, assignment);
  } catch {
    sendError(res, 'Failed to fetch assignment', 500);
  }
}

export async function getSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) { sendError(res, 'Student not found', 404); return; }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: req.params.id, studentId: student.id }
    });
    sendSuccess(res, submissions);
  } catch {
    sendError(res, 'Failed to fetch submissions', 500);
  }
}

export async function submitAssignment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) { sendError(res, 'Student not found', 404); return; }

    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) { sendError(res, 'Assignment not found', 404); return; }
    if (assignment.status !== 'Active') { sendError(res, 'Assignment is closed', 400); return; }

    const file = req.file;
    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      update: {
        fileUrl: file ? `/uploads/${file.filename}` : undefined,
        fileName: file?.originalname,
        remarks: req.body.remarks,
        submittedAt: new Date(),
      },
      create: {
        assignmentId: assignment.id,
        studentId: student.id,
        fileUrl: file ? `/uploads/${file.filename}` : undefined,
        fileName: file?.originalname,
        remarks: req.body.remarks,
      }
    });

    // Notification
    await prisma.notification.create({
      data: { userId, text: `Your submission for "${assignment.title}" has been received`, type: 'assignment' }
    });

    sendSuccess(res, submission, 'Assignment submitted', 201);
  } catch {
    sendError(res, 'Failed to submit assignment', 500);
  }
}
