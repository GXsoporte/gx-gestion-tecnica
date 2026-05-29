import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');

    const where: any = { ...filter };
    if (active === 'true') where.isActive = true;

    const services = await db.service.findMany({
      where,
      include: {
        subservices: { where: { isActive: true }, orderBy: { name: 'asc' } },
        _count: { select: { invoiceItems: true } },
      },
      orderBy: { name: 'asc' },
    });
    return apiResponse(services);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const companyId = session.user.companyId ?? '__NO_COMPANY__';

    const body = await req.json();
    const data = serviceSchema.parse(body);

    const serviceNumber = await nextNumber('SER', db.service, 'serviceNumber', { companyId });

    const service = await db.service.create({
      data: { ...data, serviceNumber, companyId },
      include: { subservices: true },
    });
    return apiResponse(service, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
