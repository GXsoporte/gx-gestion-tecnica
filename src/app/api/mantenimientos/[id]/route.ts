import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const updateSchema = z.object({
  title:         z.string().min(1).optional(),
  description:   z.string().optional(),
  type:          z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE']).optional(),
  status:        z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE']).optional(),
  scheduledDate: z.string().optional(),
  technicianId:  z.string().optional(),
  notes:         z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const maintenance = await prisma.maintenance.findFirst({
      where: { id: params.id, ...filter },
      include: {
        client:     { select: { id: true, companyName: true } },
        asset:      { select: { id: true, brand: true, model: true, serial: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    if (!maintenance) return apiError('Mantenimiento no encontrado', 404);
    return apiResponse(maintenance);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);

    const existing = await prisma.maintenance.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Mantenimiento no encontrado', 404);

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: any = { ...data };
    if (data.scheduledDate) {
      updateData.scheduledDate = new Date(data.scheduledDate);
    }

    if (data.status === 'COMPLETED') {
      updateData.completedDate = new Date();
    }

    const updated = await prisma.maintenance.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client:     { select: { companyName: true } },
        technician: { select: { name: true } },
      },
    });

    await logAudit('UPDATE', 'Maintenance', params.id, existing.companyId, session.user.id);

    // Auto-crear actividad al pasar a IN_PROGRESS
    let autoActivity = null;
    if (data.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS') {
      const existingActivity = await prisma.activity.findFirst({
        where: { maintenanceId: params.id } as any,
        select: { id: true },
      });

      if (!existingActivity) {
        const activityNumber = await nextNumber(
          'GX-ACT',
          prisma.activity,
          'activityNumber',
          { companyId: existing.companyId }
        );

        autoActivity = await (prisma.activity as any).create({
          data: {
            activityNumber,
            description: existing.title,
            diagnosis: existing.description ?? '',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            clientId: existing.clientId,
            technicianId: existing.technicianId,
            createdById: session.user.id,
            companyId: existing.companyId,
            assetId: existing.assetId ?? undefined,
            maintenanceId: params.id,
          },
          include: {
            client:     { select: { companyName: true } },
            technician: { select: { name: true } },
          },
        });

        await logAudit('CREATE', 'Activity', autoActivity.id, existing.companyId, session.user.id);
      }
    }

    return apiResponse({ ...updated, autoActivity });
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);

    const maintenance = await prisma.maintenance.findFirst({ where: { id: params.id, ...filter } });
    if (!maintenance) return apiError('Mantenimiento no encontrado', 404);

    await prisma.maintenance.delete({ where: { id: params.id } });
    await logAudit('DELETE', 'Maintenance', params.id, maintenance.companyId, session.user.id);

    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
