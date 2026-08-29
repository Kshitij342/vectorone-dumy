import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';
import path from 'path';
import fs from 'fs';

export async function getResources(req: Request, res: Response): Promise<void> {
  try {
    const { q, type, courseId, departmentId, page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (courseId) where.courseId = courseId;
    if (departmentId) where.departmentId = departmentId;
    if (q) where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          course: { select: { courseCode: true, name: true } },
          department: { select: { name: true } },
          uploader: { select: { fullName: true } },
        }
      }),
      prisma.resource.count({ where })
    ]);

    sendSuccess(res, resources, 'Resources fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch resources', 500);
  }
}

export async function getResourceById(req: Request, res: Response): Promise<void> {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { courseCode: true, name: true } },
        uploader: { select: { fullName: true } }
      }
    });
    if (!resource) { sendError(res, 'Resource not found', 404); return; }
    sendSuccess(res, resource);
  } catch {
    sendError(res, 'Failed to fetch resource', 500);
  }
}

export async function downloadResource(req: Request, res: Response): Promise<void> {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource || !resource.fileUrl) { sendError(res, 'Resource or file not found', 404); return; }

    // Increment download count
    await prisma.resource.update({ where: { id: resource.id }, data: { downloadCount: { increment: 1 } } });

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, path.basename(resource.fileUrl));

    if (!fs.existsSync(filePath)) { sendError(res, 'File not found on server', 404); return; }

    res.download(filePath, resource.fileName || 'download');
  } catch {
    sendError(res, 'Failed to download resource', 500);
  }
}
