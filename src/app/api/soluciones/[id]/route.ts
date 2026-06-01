import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const updateSchema = z.object({
  activitiesDone: z.string().optional(),
  spareParts: z.string().optional(),
  installedSoftware: z.string().optional(),
  configurations: z.string().optional(),
  testsDone: z.string().optional(),
  finalResult: z.string().optional(),
  recommendations: z.string().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  deliveryStatus: z.enum(['PENDING', 'DELIVERED']).optional(),
  endDate: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const solution = await db.solution.findFirst({
      where: { id: params.id, ...filter },
      include: {
        ticket: { select: { ticketNumber: true, subject: true, status: true } },
        diagnosis: { select: { diagnosisNumber: true, description: true, estimatedCost: true } },
        asset: { select: { brand: true, model: true, serial: true, type: true } },
        client: { select: { companyName: true, contactName: true, email: true } },
        technician: { select: { name: true, email: true } },
        attachments: true,
      },
    });

    if (!solution) return apiError('Solución no encontrada', 404);
    return apiResponse(solution);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const companyId = filter.companyId ?? session.user.companyId ?? '__NO_COMPANY__';

    const existing = await db.solution.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Solución no encontrada', 404);

    const data = updateSchema.parse(await req.json());
    const updateData: any = { ...data };
    if (data.status === 'COMPLETED' && !existing.endDate) updateData.endDate = new Date();
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const solution = await db.solution.update({
      where: { id: params.id },
      data: updateData,
    });

    // Cuando la solución se completa → diagnóstico COMPLETED → ticket ARCHIVED
    if (data.status === 'COMPLETED') {
      if (existing.diagnosisId) {
        await db.diagnosis.update({
          where: { id: existing.diagnosisId },
          data: { status: 'COMPLETED', updatedAt: new Date() },
        }).catch(() => {});
      }
      await db.ticket.update({
        where: { id: existing.ticketId },
        data: { status: 'ARCHIVED' },
      });
    }
    if (data.deliveryStatus === 'DELIVERED') {
      await db.ticket.update({
        where: { id: existing.ticketId },
        data: { status: 'DELIVERED', closedAt: new Date() },
      });
    }

    await logAudit('UPDATE', 'Solution', params.id, companyId, session.user.id);
    return apiResponse(solution);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
    return apiError(e.message, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR'].includes(session.user.role)) {
      return apiError('Sin permisos para eliminar soluciones', 403);
    }
    const filter = getCompanyFilter(session);
    const companyId = filter.companyId ?? session.user.companyId ?? '__NO_COMPANY__';

    const existing = await db.solution.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Solución no encontrada', 404);

    // Revertir ticket al estado REPAIR_APPROVED para que pueda crearse otra solución
    if (existing.ticketId) {
      await db.ticket.update({
        where: { id: existing.ticketId },
        data: { status: 'REPAIR_APPROVED' },
      }).catch(() => {});
    }

    await db.solution.delete({ where: { id: params.id } });
    await logAudit('DELETE', 'Solution', params.id, companyId, session.user.id);
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
