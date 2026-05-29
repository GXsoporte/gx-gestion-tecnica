import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxClients: z.number().int().min(1).optional(),
  maxTickets: z.number().int().nullable().optional(),
  maxStorageGb: z.number().int().min(1).optional(),
  durationDays: z.number().int().nullable().optional(),
  hasInventory: z.boolean().optional(),
  hasTickets: z.boolean().optional(),
  hasActivities: z.boolean().optional(),
  hasManualDiagnosis: z.boolean().optional(),
  hasAIDiagnosis: z.boolean().optional(),
  hasInvoicing: z.boolean().optional(),
  hasServices: z.boolean().optional(),
  hasDocuments: z.boolean().optional(),
  hasAdvancedKPIs: z.boolean().optional(),
  hasPDFExport: z.boolean().optional(),
  hasAutoEmails: z.boolean().optional(),
  hasBrandCustom: z.boolean().optional(),
  hasAuditLog: z.boolean().optional(),
  hasMaintenances: z.boolean().optional(),
  hasCoordinator: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const plan = await db.plan.findUnique({
      where: { id: params.id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) return apiError('Plan no encontrado', 404);
    return apiResponse(plan);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const body = await req.json();
    const data = updateSchema.parse(body);

    const plan = await db.plan.update({ where: { id: params.id }, data });
    return apiResponse(plan);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
    return apiError(e.message, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const plan = await db.plan.findUnique({
      where: { id: params.id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) return apiError('Plan no encontrado', 404);
    if (plan._count.subscriptions > 0) return apiError('No se puede eliminar: tiene empresas suscritas', 400);

    await db.plan.delete({ where: { id: params.id } });
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
