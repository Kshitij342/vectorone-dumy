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

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 'Failed to fetch admin notices', 500);
  }
}

export async function createNotice(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const admin = await prisma.admin.findUnique({ where: { userId } });
    if (!admin) {
      sendError(res, 'Admin record not found', 404);
      return;
    }

    const { title, body, category, audience, status, priority, published } = req.body;

    let noticeStatus: NoticeStatus = NoticeStatus.Draft;
    if (status === 'Published') noticeStatus = NoticeStatus.Published;
    if (status === 'Scheduled') noticeStatus = NoticeStatus.Scheduled;

    let noticePriority: NoticePriority = NoticePriority.Medium;
    if (priority === 'High') noticePriority = NoticePriority.High;
    if (priority === 'Low') noticePriority = NoticePriority.Low;

    const count = await prisma.notice.count();
    const noticeId = `NTC-${String(count + 1).padStart(2, '0')}`;

    const notice = await prisma.notice.create({
      data: {
        noticeId,
        title,
        body: body || '',
        category: category || 'Academic',
        audience: audience || 'All Students',
        status: noticeStatus,
        priority: noticePriority,
        publishedAt: published ? new Date(published) : noticeStatus === NoticeStatus.Published ? new Date() : null,
        authorId: admin.id,
      },
    });

    sendSuccess(res, notice, 'Notice created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create notice', 500);
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

    const updated = await prisma.notice.update({
      where: { id: notice.id },
      data: {
        title: title !== undefined ? title : notice.title,
        body: body !== undefined ? body : notice.body,
        category: category || notice.category,
        audience: audience || notice.audience,
        status: noticeStatus,
        priority: noticePriority,
        publishedAt: published ? new Date(published) : notice.publishedAt,
      },
    });

    sendSuccess(res, updated, 'Notice updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update notice', 500);
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

    sendSuccess(res, updated, 'Notice published successfully');
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

    const updated = await prisma.notice.update({
      where: { id: notice.id },
      data: {
        status: NoticeStatus.Scheduled,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      },
    });

    sendSuccess(res, updated, 'Notice scheduled successfully');
  } catch (error) {
    sendError(res, 'Failed to schedule notice', 500);
  }
}
