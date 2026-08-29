import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export async function getAdminSettings(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    sendSuccess(res, map);
  } catch (error) {
    sendError(res, 'Failed to fetch admin settings', 500);
  }
}

export async function updateAdminSettings(req: Request, res: Response): Promise<void> {
  try {
    const updates = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    sendSuccess(res, null, 'Settings saved successfully');
  } catch (error) {
    sendError(res, 'Failed to update admin settings', 500);
  }
}
