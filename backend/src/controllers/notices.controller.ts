import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../utils/paginate';
import { NoticeStatus } from '@prisma/client';

/**
 * GET /api/notices
 * Returns published notices for students with optional filtering.
 */
export async function getNotices(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, page, limit } = req.query as Record<string, string>;
    const { skip, take, page: pg, limit: lim } = parsePagination({ page, limit });

    const where: Record<string, unknown> = {
      status: NoticeStatus.Published,
    };
    if (category && category !== 'all') where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { publishedAt: 'desc' }],
        skip,
        take,
        select: {
          id: true, noticeId: true, title: true, body: true, category: true,
          audience: true, priority: true, status: true, publishedAt: true,
          attachmentUrl: true, attachmentName: true,
          author: { select: { fullName: true } }
        }
      }),
      prisma.notice.count({ where })
    ]);

    sendSuccess(res, notices, 'Notices fetched', 200, buildPaginationMeta(total, pg, lim));
  } catch {
    sendError(res, 'Failed to fetch notices', 500);
  }
}

/**
 * GET /api/notices/:id
 */
export async function getNoticeById(req: Request, res: Response): Promise<void> {
  try {
    const notice = await prisma.notice.findFirst({
      where: { OR: [{ id: req.params.id }, { noticeId: req.params.id }], status: NoticeStatus.Published },
      include: { author: { select: { fullName: true } } }
    });
    if (!notice) { sendError(res, 'Notice not found', 404); return; }
    sendSuccess(res, notice);
  } catch {
    sendError(res, 'Failed to fetch notice', 500);
  }
}
