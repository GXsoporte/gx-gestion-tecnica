import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const subSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const service = await db.service.findFirst({ where: { id: params.id, ...filter } });
    if (!service) return apiError('Servicio no encontrado', 404);

    const subservices = await db.subservice.findMany({
      where: { serviceId: params.id },
      orderBy: { name: 'asc' },
    });
    return apiResponse(subservices);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) return apiError('Sin permisos', 403);
    const filter = getCompanyFilter(session);
    const companyId = session.user.companyId ?? '__NO_COMPANY__';

    const service = await db.service.findFirst({ where: { id: params.id, ...filter } });
    if (!service) return apiError('Servicio no encontrado', 404);

    const data = subSchema.parse(await req.json());
    const subserviceNumber = await nextNumber('SUB', db.subservice, 'subserviceNumber', { companyId });

    const subservice = await db.subservice.create({
      data: { ...data, subserviceNumber, serviceId: params.id, companyId },
    });
    return apiResponse(subservice, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
