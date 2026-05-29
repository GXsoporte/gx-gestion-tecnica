import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const subSchema = z.object({
  companyId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum(['DEMO', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).default('ACTIVE'),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const subs = await db.subscription.findMany({
      where,
      include: {
        company: { select: { name: true, nit: true, email: true } },
        plan: { select: { name: true, code: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiResponse(subs);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const body = await req.json();
    const data = subSchema.parse(body);

    // Upsert — una empresa solo puede tener 1 suscripción activa
    const sub = await db.subscription.upsert({
      where: { companyId: data.companyId },
      create: {
        companyId: data.companyId,
        planId: data.planId,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        notes: data.notes,
        createdById: session.user.id,
      },
      update: {
        planId: data.planId,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : null,
        notes: data.notes,
      },
      include: {
        company: { select: { name: true } },
        plan: { select: { name: true } },
      },
    });

    await logAudit('UPSERT', 'Subscription', sub.id, data.companyId, session.user.id);
    return apiResponse(sub, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
    return apiError(e.message, 500);
  }
}
