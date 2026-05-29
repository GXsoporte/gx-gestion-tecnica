import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const updateSchema = z.object({
  description: z.string().optional(),
  problemCause: z.string().optional(),
  recommendation: z.string().optional(),
  requiresRepair: z.boolean().optional(),
  estimatedCost: z.number().min(0).nullable().optional(),
  estimatedTime: z.string().optional(),
  technicianNotes: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'INFO_REQUESTED']).optional(),
});

const STATUS_TICKET_MAP: Record<string, string> = {
  SENT: 'DIAGNOSIS_SENT',
  APPROVED: 'REPAIR_APPROVED',
  REJECTED: 'REPAIR_REJECTED',
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const diagnosis = await db.diagnosis.findFirst({
      where: { id: params.id, ...filter },
      include: {
        ticket: { select: { ticketNumber: true, subject: true, status: true } },
        asset: { select: { brand: true, model: true, serial: true, type: true } },
        client: { select: { companyName: true, contactName: true, email: true } },
        technician: { select: { name: true, email: true } },
        solutions: { select: { id: true, solutionNumber: true, status: true } },
        attachments: true,
      },
    });

    if (!diagnosis) return apiError('Diagnóstico no encontrado', 404);
    return apiResponse(diagnosis);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const companyId = filter.companyId ?? session.user.companyId ?? '__NO_COMPANY__';

    // CLIENT can only APPROVE or REJECT
    if (session.user.role === 'CLIENT') {
      const body = await req.json();
      if (!['APPROVED', 'REJECTED', 'INFO_REQUESTED'].includes(body.status)) {
        return apiError('Sin permisos para esta acción', 403);
      }
    }

    const existing = await db.diagnosis.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Diagnóstico no encontrado', 404);

    const data = updateSchema.parse(await req.json());
    const updateData: any = { ...data };

    if (data.status === 'SENT') updateData.sentAt = new Date();
    if (data.status === 'APPROVED') updateData.approvedAt = new Date();
    if (data.status === 'REJECTED') updateData.rejectedAt = new Date();

    const diagnosis = await db.diagnosis.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ticket: { select: { ticketNumber: true } },
        client: { select: { companyName: true } },
      },
    });

    // Sincronizar estado del ticket
    if (data.status && STATUS_TICKET_MAP[data.status]) {
      await db.ticket.update({
        where: { id: existing.ticketId },
        data: { status: STATUS_TICKET_MAP[data.status] },
      });
    }

    await logAudit('UPDATE', 'Diagnosis', params.id, companyId, session.user.id);
    return apiResponse(diagnosis);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
    return apiError(e.message, 500);
  }
}
