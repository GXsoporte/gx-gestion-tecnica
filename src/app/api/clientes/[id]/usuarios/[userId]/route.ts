import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const platformSchema = z.object({
  name:     z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
});

const updateSchema = z.object({
  name:           z.string().min(1).optional(),
  cargo:          z.string().optional(),
  pcUsername:     z.string().optional(),
  pcPassword:     z.string().optional(),
  adminUsername:  z.string().optional(),
  adminPassword:  z.string().optional(),
  email1:         z.string().optional(),
  email1Password: z.string().optional(),
  email2:         z.string().optional(),
  email2Password: z.string().optional(),
  platforms:      z.array(platformSchema).optional(),
  notes:          z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);

    const client = await prisma.client.findFirst({ where: { id: params.id, ...filter } });
    if (!client) return apiError('Cliente no encontrado', 404);

    const existing = await db.clientUser.findFirst({
      where: { id: params.userId, clientId: params.id },
    });
    if (!existing) return apiError('Usuario no encontrado', 404);

    const body = await req.json();
    const data = updateSchema.parse(body);

    const { platforms, ...rest } = data;
    const updated = await db.clientUser.update({
      where: { id: params.userId },
      data: {
        ...rest,
        ...(platforms !== undefined
          ? { platforms: JSON.stringify(platforms) }
          : {}),
      },
    });

    await logAudit('UPDATE', 'ClientUser', params.userId, client.companyId, session.user.id);
    return apiResponse(updated);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
    return apiError(e.message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);

    const client = await prisma.client.findFirst({ where: { id: params.id, ...filter } });
    if (!client) return apiError('Cliente no encontrado', 404);

    await db.clientUser.delete({ where: { id: params.userId } });
    await logAudit('DELETE', 'ClientUser', params.userId, client.companyId, session.user.id);
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
