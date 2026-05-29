import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const updateSchema = z.object({
  description: z.string().optional(),
  diagnosis: z.string().optional(),
  solution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED']).optional(),
  technicianId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, ...filter },
      include: {
        client: true,
        technician: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        asset: true,
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
        attachments: true,
        timeEntries: { include: { user: { select: { name: true } } } },
        diagnosis_ai: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!activity) return apiError('Actividad no encontrada', 404);

    return apiResponse(activity);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.activity.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Actividad no encontrada', 404);

    const updateData: any = { ...data };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
      const start = updateData.startTime || existing.startTime;
      if (start) {
        updateData.totalMinutes = Math.round(
          (new Date(data.endTime).getTime() - new Date(start).getTime()) / 60000
        );
      }
    }

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAudit('UPDATE', 'Activity', params.id, session.user.companyId!, session.user.id, existing, data);

    return apiResponse(updated);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);
    const existing = await prisma.activity.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Actividad no encontrada', 404);

    await prisma.activity.delete({ where: { id: params.id } });
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
