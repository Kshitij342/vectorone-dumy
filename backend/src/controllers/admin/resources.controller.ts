import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { ResourceType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

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

    const formatted = resources.map((r) => {
      let ext = 'PDF';
      if (r.type === ResourceType.Video) ext = 'MP4';
      if (r.type === ResourceType.Spreadsheet) ext = 'XLSX';
      if (r.type === ResourceType.Document) ext = 'DOCX';
      if (r.fileName && r.fileName.includes('.')) {
        ext = r.fileName.split('.').pop()?.toUpperCase() || ext;
      }

      const sizeStr = r.fileSize ? `${(r.fileSize / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB';

      return {
        id: r.id,
        title: r.title,
        description: r.description || '',
        type: r.type,
        ext,
        course: r.course?.name || 'General',
        department: r.department?.name || 'Computer Science',
        uploader: r.uploader?.fullName || 'Administrator',
        uploadedBy: r.uploader?.fullName || 'Administrator',
        size: sizeStr,
        downloads: r.downloadCount,
        status: 'Published',
        date: r.createdAt.toISOString().split('T')[0],
        fileUrl: r.fileUrl,
      };
    });

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

    const { title, description, type, ext, courseCode, department, uploader, status } = req.body;
    const file = req.file;

    let course = null;
    if (courseCode) {
      course = await prisma.course.findFirst({ where: { courseCode } });
    }

    let dept = null;
    if (department) {
      dept = await prisma.department.findFirst({ where: { name: { contains: department, mode: 'insensitive' } } });
    }

    let rType: ResourceType = ResourceType.PDF;
    if (type === 'Video' || ext === 'MP4') rType = ResourceType.Video;
    if (type === 'Presentation' || ext === 'PPTX' || type === 'Document' || ext === 'DOCX') rType = ResourceType.Document;
    if (type === 'Spreadsheet' || ext === 'XLSX') rType = ResourceType.Spreadsheet;

    const resource = await prisma.resource.create({
      data: {
        title: title || 'Untitled Resource',
        description: description || '',
        type: rType,
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

    let ext = 'PDF';
    if (resource.type === ResourceType.Video) ext = 'MP4';
    if (resource.type === ResourceType.Spreadsheet) ext = 'XLSX';
    if (resource.type === ResourceType.Document) ext = 'DOCX';
    if (resource.fileName && resource.fileName.includes('.')) {
      ext = resource.fileName.split('.').pop()?.toUpperCase() || ext;
    }

    sendSuccess(res, {
      ...resource,
      ext,
      uploader: resource.uploader?.fullName || 'Administrator',
      uploadedBy: resource.uploader?.fullName || 'Administrator',
      department: resource.department?.name || 'Computer Science',
      size: resource.fileSize ? `${(resource.fileSize / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB',
      downloads: resource.downloadCount,
      status: 'Published',
    });
  } catch (error) {
    sendError(res, 'Failed to fetch resource', 500);
  }
}

export async function updateAdminResource(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, type, ext } = req.body;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      sendError(res, 'Resource not found', 404);
      return;
    }

    let rType = resource.type;
    if (type === 'Video' || ext === 'MP4') rType = ResourceType.Video;
    if (type === 'Presentation' || ext === 'PPTX' || type === 'Document' || ext === 'DOCX') rType = ResourceType.Document;
    if (type === 'Spreadsheet' || ext === 'XLSX') rType = ResourceType.Spreadsheet;
    if (type === 'PDF' || ext === 'PDF') rType = ResourceType.PDF;

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        title: title !== undefined ? title : resource.title,
        description: description !== undefined ? description : resource.description,
        type: rType,
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

    if (resource.fileUrl) {
      const filePath = path.join(process.cwd(), resource.fileUrl.startsWith('/') ? resource.fileUrl.slice(1) : resource.fileUrl);
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (fileErr) {
        console.warn('VectorOne deleteAdminResource file unlink warning:', fileErr);
      }
    }

    await prisma.resource.delete({ where: { id } });
    sendSuccess(res, null, 'Resource deleted successfully');
  } catch (error) {
    console.error('VectorOne deleteAdminResource Error:', error);
    sendError(res, 'Failed to delete resource', 500);
  }
}
