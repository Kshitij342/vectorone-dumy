import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { ResourceType } from '@prisma/client';

export async function getAdminResources(req: Request, res: Response): Promise<void> {
  try {
    const { q, type, department } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (type) where.type = type as ResourceType;
    if (department) where.department = { name: department };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { courseCode: true, name: true } },
        department: { select: { name: true } },
        uploader: { select: { fullName: true } },
      },
    });

    const formatted = resources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      type: r.type,
      course: r.course?.name || 'General',
      department: r.department?.name || 'All Departments',
      uploadedBy: r.uploader.fullName,
      downloads: r.downloadCount,
      date: r.createdAt.toISOString().split('T')[0],
      fileUrl: r.fileUrl,
    }));

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch admin resources', 500);
  }
}

export async function createAdminResource(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const admin = await prisma.admin.findUnique({ where: { userId } });
    if (!admin) {
      sendError(res, 'Admin record not found', 404);
      return;
    }

    const { title, description, type, courseCode, department } = req.body;
    const file = req.file;

    let course = null;
    if (courseCode) {
      course = await prisma.course.findFirst({ where: { courseCode } });
    }

    let dept = null;
    if (department) {
      dept = await prisma.department.findFirst({ where: { name: { contains: department, mode: 'insensitive' } } });
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description: description || '',
        type: (type as ResourceType) || ResourceType.PDF,
        fileUrl: file ? `/uploads/${file.filename}` : null,
        fileName: file ? file.originalname : null,
        fileSize: file ? file.size : null,
        courseId: course?.id || null,
        departmentId: dept?.id || null,
        uploaderId: admin.id,
      },
    });

    sendSuccess(res, resource, 'Resource uploaded successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create resource', 500);
  }
}

export async function getAdminResourceById(req: Request, res: Response): Promise<void> {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: { course: true, department: true, uploader: true },
    });

    if (!resource) {
      sendError(res, 'Resource not found', 404);
      return;
    }

    sendSuccess(res, resource);
  } catch (error) {
    sendError(res, 'Failed to fetch resource', 500);
  }
}

export async function updateAdminResource(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, type } = req.body;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      sendError(res, 'Resource not found', 404);
      return;
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        title: title !== undefined ? title : resource.title,
        description: description !== undefined ? description : resource.description,
        type: type ? (type as ResourceType) : resource.type,
      },
    });

    sendSuccess(res, updated, 'Resource updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update resource', 500);
  }
}

export async function deleteAdminResource(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      sendError(res, 'Resource not found', 404);
      return;
    }

    await prisma.resource.delete({ where: { id } });
    sendSuccess(res, null, 'Resource deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete resource', 500);
  }
}
