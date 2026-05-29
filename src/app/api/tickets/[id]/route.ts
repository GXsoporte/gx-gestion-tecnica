import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const updateSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'ESCALATED', 'RESOLVED', 'CLOSED']).optional(),
  assignedToId: z.string().optional().nullable(),
  resolution: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, ...filter },
      include: {
        client: true,
        assignedTo: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        relatedAsset: true,
        comments: {
          include: { user: { select: { id: true, name: true, image: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        activities: {
          include: { technician: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        timeEntries: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!ticket) return apiError('Ticket no encontrado', 404);

    return apiResponse(ticket);
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

    const existing = await prisma.ticket.findFirst({
      where: { id: params.id, ...filter },
    });
    if (!existing) return apiError('Ticket no encontrado', 404);

    const updateData: any = { ...data };
    if (data.status === 'CLOSED' || data.status === 'RESOLVED') {
      updateData.closedAt = new Date();
    }
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    const updated = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: { select: { companyName: true } },
        assignedTo: { select: { name: true } },
      },
    });

    await logAudit('UPDATE', 'Ticket', params.id, session.user.companyId!, session.user.id, existing, data);

    // ── Auto-crear actividad al pasar a IN_PROGRESS ───────────────────────
    let createdActivity = null;
    if (data.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS') {
      // Solo crear si no existe ya una actividad vinculada
      const existingActivity = await prisma.activity.findFirst({
        where: { ticketId: params.id },
        select: { id: true },
      });

      if (!existingActivity) {
        const technicianId = existing.assignedToId ?? updated.assignedToId ?? session.user.id;

        const activityNumber = await nextNumber(
          'GX-ACT',
          prisma.activity,
          'activityNumber',
          { companyId: session.user.companyId! }
        );

        createdActivity = await prisma.activity.create({
          data: {
            activityNumber,
            description: existing.subject,
            diagnosis: existing.description,
            priority: existing.priority,
            status: 'IN_PROGRESS',
            clientId: existing.clientId,
            technicianId,
            createdById: session.user.id,
            companyId: session.user.companyId!,
            ticketId: params.id,
            assetId: existing.relatedAssetId ?? undefined,
          },
          include: {
            client: { select: { companyName: true } },
            technician: { select: { name: true } },
          },
        });

        await logAudit('CREATE', 'Activity', createdActivity.id, session.user.companyId!, session.user.id);
      }
    }

    return apiResponse({ ...updated, autoActivity: createdActivity });
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
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

    const existing = await prisma.ticket.findFirst({
      where: { id: params.id, ...filter },
    });
    if (!existing) return apiError('Ticket no encontrado', 404);

    await prisma.ticket.delete({ where: { id: params.id } });
    await logAudit('DELETE', 'Ticket', params.id, session.user.companyId!, session.user.id, existing, null);

    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
