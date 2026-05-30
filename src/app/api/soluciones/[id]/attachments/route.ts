import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';

const db = prisma as any;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const solution = await db.solution.findFirst({ where: { id: params.id, ...filter } });
    if (!solution) return apiError('Solución no encontrada', 404);

    const attachments = await prisma.attachment.findMany({
      where: { solutionId: params.id },
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
    const solution = await db.solution.findFirst({ where: { id: params.id, ...filter } });
    if (!solution) return apiError('Solución no encontrada', 404);

    const { url, name, originalName, size, mimeType } = await req.json();
    const attachment = await prisma.attachment.create({
      data: { url, name, originalName, size, mimeType, solutionId: params.id },
    });
    return apiResponse(attachment, 201);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
