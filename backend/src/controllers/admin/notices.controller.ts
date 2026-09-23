import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { NoticeStatus, NoticePriority } from '@prisma/client';

export async function getAdminNotices(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, status } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) {
      if (status === 'Published') where.status = NoticeStatus.Published;
      if (status === 'Scheduled') where.status = NoticeStatus.Scheduled;
      if (status === 'Draft') where.status = NoticeStatus.Draft;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { audience: { contains: q, mode: 'insensitive' } },
      ];
    }

    const notices = await prisma.notice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { fullName: true } } },
    });

    const formatted = notices.map((n) => ({
      id: n.noticeId,
      _id: n.id,
      title: n.title,
      body: n.body,
      category: n.category,
      audience: n.audience,
      published: n.publishedAt ? n.publishedAt.toISOString().split('T')[0] : '',
      status: n.status,
      priority: n.priority,
    }));

    const total = formatted.length;
    const publishedCount = formatted.filter((n) => n.status === 'Published').length;
    const scheduledCount = formatted.filter((n) => n.status === 'Scheduled').length;
    const draftCount = formatted.filter((n) => n.status === 'Draft').length;

    const stats = [
      { label: 'Total Notices', value: String(total), trend: 'From database', tone: 'blue' },
      { label: 'Published', value: String(publishedCount), trend: 'Live on portal', tone: 'green' },
      { label: 'Scheduled', value: String(scheduledCount), trend: 'Queued', tone: 'purple' },
      { label: 'Drafts', value: String(draftCount), trend: 'Awaiting review', tone: 'orange' },
    ];

    sendSuccess(res, formatted, undefined, 200, { stats });
  } catch (error) {
    sendError(res, 'Failed to fetch admin notices', 500);
  }
}

export async function createNotice(req: Request, res: Response): Promise<void> {
  try {
    const { title, body, category, audience, status, priority, published } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      sendError(res, 'Title is required', 400);
      return;
    }

    const userId = req.user!.userId;
    let admin = await prisma.admin.findUnique({ where: { userId } });
    if (!admin) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.role === 'ADMIN') {
        admin = await prisma.admin.create({
          data: {
            userId,
            fullName: 'System Administrator',
          },
        });
      } else {
        admin = await prisma.admin.findFirst();
      }
    }

    if (!admin) {
      sendError(res, 'Admin record not found', 404);
      return;
    }

    let noticeStatus: NoticeStatus = NoticeStatus.Draft;
    if (status === 'Published') noticeStatus = NoticeStatus.Published;
    if (status === 'Scheduled') noticeStatus = NoticeStatus.Scheduled;

    let noticePriority: NoticePriority = NoticePriority.Medium;
    if (priority === 'High') noticePriority = NoticePriority.High;
    if (priority === 'Low') noticePriority = NoticePriority.Low;

    // Safely calculate next sequential noticeId based on highest existing NTC-XX
    const existingNotices = await prisma.notice.findMany({ select: { noticeId: true } });
    let maxNum = 0;
    for (const n of existingNotices) {
      const match = n.noticeId.match(/NTC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const noticeId = `NTC-${String(maxNum + 1).padStart(2, '0')}`;

    let publishedAt: Date | null = null;
    if (published && typeof published === 'string' && published.trim()) {
      const parsed = new Date(published);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }
    if (!publishedAt && noticeStatus === NoticeStatus.Published) {
      publishedAt = new Date();
    }

    const notice = await prisma.notice.create({
      data: {
        noticeId,
        title: title.trim(),
        body: (body || '').trim(),
        category: category || 'Academic',
        audience: audience || 'All Students',
        status: noticeStatus,
        priority: noticePriority,
        publishedAt,
        authorId: admin.id,
      },
    });

    const formatted = {
      id: notice.noticeId,
      _id: notice.id,
      title: notice.title,
      body: notice.body,
      category: notice.category,
      audience: notice.audience,
      published: notice.publishedAt ? notice.publishedAt.toISOString().split('T')[0] : '',
      status: notice.status,
      priority: notice.priority,
    };

    sendSuccess(res, formatted, 'Notice created successfully', 201);
  } catch (error: any) {
    sendError(res, error?.message || 'Failed to create notice', 500);
  }
}

export async function getNoticeById(req: Request, res: Response): Promise<void> {
  try {
    const notice = await prisma.notice.findFirst({
      where: { OR: [{ id: req.params.id }, { noticeId: req.params.id }] },
    });

    if (!notice) {
      sendError(res, 'Notice not found', 404);
      return;
    }

    sendSuccess(res, {
      id: notice.noticeId,
      _id: notice.id,
      title: notice.title,
      body: notice.body,
      category: notice.category,
      audience: notice.audience,
      published: notice.publishedAt ? notice.publishedAt.toISOString().split('T')[0] : '',
      status: notice.status,
      priority: notice.priority,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch notice', 500);
  }
}

export async function updateNotice(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, body, category, audience, status, priority, published } = req.body;

    const notice = await prisma.notice.findFirst({
      where: { OR: [{ id }, { noticeId: id }] },
    });

    if (!notice) {
      sendError(res, 'Notice not found', 404);
      return;
    }

    let noticeStatus: NoticeStatus = notice.status;
    if (status === 'Published') noticeStatus = NoticeStatus.Published;
    if (status === 'Scheduled') noticeStatus = NoticeStatus.Scheduled;
    if (status === 'Draft') noticeStatus = NoticeStatus.Draft;

    let noticePriority: NoticePriority = notice.priority;
    if (priority === 'High') noticePriority = NoticePriority.High;
    if (priority === 'Medium') noticePriority = NoticePriority.Medium;
    if (priority === 'Low') noticePriority = NoticePriority.Low;

    let publishedAt: Date | null = notice.publishedAt;
    if (published && typeof published === 'string' && published.trim()) {
      const parsed = new Date(published);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    } else if (noticeStatus === NoticeStatus.Published && !notice.publishedAt) {
      publishedAt = new Date();
    }

    const updated = await prisma.notice.update({
      where: { id: notice.id },
      data: {
        title: title !== undefined ? title.trim() : notice.title,
        body: body !== undefined ? body.trim() : notice.body,
        category: category || notice.category,
        audience: audience || notice.audience,
        status: noticeStatus,
        priority: noticePriority,
        publishedAt,
      },
    });

    const formatted = {
      id: updated.noticeId,
      _id: updated.id,
      title: updated.title,
      body: updated.body,
      category: updated.category,
      audience: updated.audience,
      published: updated.publishedAt ? updated.publishedAt.toISOString().split('T')[0] : '',
      status: updated.status,
      priority: updated.priority,
    };

    sendSuccess(res, formatted, 'Notice updated successfully');
  } catch (error: any) {
    sendError(res, error?.message || 'Failed to update notice', 500);
  }
}

export async function deleteNotice(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const notice = await prisma.notice.findFirst({
      where: { OR: [{ id }, { noticeId: id }] },
    });

    if (!notice) {
      sendError(res, 'Notice not found', 404);
      return;
    }

    await prisma.notice.delete({ where: { id: notice.id } });
    sendSuccess(res, null, 'Notice deleted successfully');
  } catch (error) {
    sendError(res, 'Failed to delete notice', 500);
  }
}

export async function publishNotice(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const notice = await prisma.notice.findFirst({
      where: { OR: [{ id }, { noticeId: id }] },
    });

    if (!notice) {
      sendError(res, 'Notice not found', 404);
      return;
    }

    const updated = await prisma.notice.update({
      where: { id: notice.id },
      data: {
        status: NoticeStatus.Published,
        publishedAt: new Date(),
      },
    });

    const formatted = {
      id: updated.noticeId,
      _id: updated.id,
      title: updated.title,
      body: updated.body,
      category: updated.category,
      audience: updated.audience,
      published: updated.publishedAt ? updated.publishedAt.toISOString().split('T')[0] : '',
      status: updated.status,
      priority: updated.priority,
    };

    sendSuccess(res, formatted, 'Notice published successfully');
  } catch (error) {
    sendError(res, 'Failed to publish notice', 500);
  }
}

export async function scheduleNotice(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    const notice = await prisma.notice.findFirst({
      where: { OR: [{ id }, { noticeId: id }] },
    });

    if (!notice) {
      sendError(res, 'Notice not found', 404);
      return;
    }

    let schedDate = new Date();
    if (scheduledAt && typeof scheduledAt === 'string' && scheduledAt.trim()) {
      const parsed = new Date(scheduledAt);
      if (!isNaN(parsed.getTime())) schedDate = parsed;
    }

    const updated = await prisma.notice.update({
      where: { id: notice.id },
      data: {
        status: NoticeStatus.Scheduled,
        scheduledAt: schedDate,
      },
    });

    const formatted = {
      id: updated.noticeId,
      _id: updated.id,
      title: updated.title,
      body: updated.body,
      category: updated.category,
      audience: updated.audience,
      published: updated.publishedAt ? updated.publishedAt.toISOString().split('T')[0] : '',
      status: updated.status,
      priority: updated.priority,
    };

    sendSuccess(res, formatted, 'Notice scheduled successfully');
  } catch (error) {
    sendError(res, 'Failed to schedule notice', 500);
  }
}
