import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) return apiError('Sin permisos', 403);
    const filter = getCompanyFilter(session);

    const existing = await db.service.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Servicio no encontrado', 404);

    const data = updateSchema.parse(await req.json());
    const service = await db.service.update({
      where: { id: params.id },
      data,
      include: { subservices: true },
    });
    return apiResponse(service);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) return apiError('Sin permisos', 403);
    const filter = getCompanyFilter(session);

    const existing = await db.service.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Servicio no encontrado', 404);

    await db.service.delete({ where: { id: params.id } });
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
