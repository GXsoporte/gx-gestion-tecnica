import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const asset = await prisma.asset.findFirst({
      where: { id: params.id, ...filter },
      include: {
        client: true,
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
        maintenances: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
          include: { technician: { select: { name: true } } },
        },
        attachments: true,
        diagnoses: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });

    if (!asset) return apiError('Activo no encontrado', 404);

    return apiResponse(asset);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const body = await req.json();

    const existing = await prisma.asset.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Activo no encontrado', 404);

    const { purchaseDate, warrantyExpiry, ...rest } = body;
    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: {
        ...rest,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
      },
    });

    await logAudit('UPDATE', 'Asset', params.id, session.user.companyId!, session.user.id, existing, body);
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
    const existing = await prisma.asset.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Activo no encontrado', 404);

    await prisma.asset.update({ where: { id: params.id }, data: { status: 'RETIRED' } });
    await logAudit('DELETE', 'Asset', params.id, session.user.companyId!, session.user.id);
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
