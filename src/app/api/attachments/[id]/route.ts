import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
    if (!attachment) return apiError('Adjunto no encontrado', 404);

    // Delete physical file
    try {
      const filePath = path.join(process.cwd(), 'public', attachment.url);
      await unlink(filePath);
    } catch {
      // File might already be deleted; continue
    }

    await prisma.attachment.delete({ where: { id: params.id } });
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
