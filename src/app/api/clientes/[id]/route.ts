import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const updateSchema = z.object({
  companyName: z.string().optional(),
  nit: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  observations: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const client = await prisma.client.findFirst({
      where: { id: params.id, ...filter },
      include: {
        contacts: true,
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { assignedTo: { select: { name: true } } },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { technician: { select: { name: true } } },
        },
        assets: {
          orderBy: { createdAt: 'desc' },
        },
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
        _count: {
          select: { tickets: true, activities: true, assets: true },
        },
      },
    });

    if (!client) return apiError('Cliente no encontrado', 404);

    return apiResponse(client);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.client.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Cliente no encontrado', 404);

    const updated = await prisma.client.update({
      where: { id: params.id },
      data,
    });

    await logAudit('UPDATE', 'Client', params.id, session.user.companyId!, session.user.id, existing, data);
    return apiResponse(updated);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);
    const existing = await prisma.client.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Cliente no encontrado', 404);

    await prisma.client.update({
      where: { id: params.id },
      data: { status: 'INACTIVE' },
    });

    await logAudit('DELETE', 'Client', params.id, session.user.companyId!, session.user.id);
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
