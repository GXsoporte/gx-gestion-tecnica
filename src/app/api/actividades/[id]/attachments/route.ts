import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const activity = await prisma.activity.findFirst({ where: { id: params.id, ...filter } });
    if (!activity) return apiError('Actividad no encontrada', 404);

    const attachments = await prisma.attachment.findMany({
      where: { activityId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    return apiResponse(attachments);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const activity = await prisma.activity.findFirst({ where: { id: params.id, ...filter } });
    if (!activity) return apiError('Actividad no encontrada', 404);

    const body = await req.json();
    const { url, name, originalName, size, mimeType } = body;

    const attachment = await prisma.attachment.create({
      data: { url, name, originalName, size, mimeType, activityId: params.id },
    });
    return apiResponse(attachment, 201);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
