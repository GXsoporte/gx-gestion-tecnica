import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateSchema = z.object({
  name:     z.string().min(1).optional(),
  email:    z.string().email().optional(),
  password: z.string().min(8).optional(),
  role:     z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN', 'CLIENT']).optional(),
  phone:    z.string().optional(),
  position: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const user = await prisma.user.findFirst({
      where: { id: params.id, ...filter },
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, phone: true, position: true,
        department: true, lastLogin: true, createdAt: true,
      },
    });

    if (!user) return apiError('Usuario no encontrado', 404);
    return apiResponse(user);
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

    const existing = await prisma.user.findFirst({ where: { id: params.id, ...filter } });
    if (!existing) return apiError('Usuario no encontrado', 404);

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    delete updateData.password; // ya lo reemplazamos o no viene

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    await logAudit('UPDATE', 'User', params.id, existing.companyId || params.id, session.user.id);
    return apiResponse(updated);
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

    // No puede eliminarse a sí mismo
    if (params.id === session.user.id) {
      return apiError('No puedes eliminar tu propio usuario', 400);
    }

    const filter = getCompanyFilter(session);
    const user = await prisma.user.findFirst({ where: { id: params.id, ...filter } });
    if (!user) return apiError('Usuario no encontrado', 404);

    // No puede eliminarse un SUPER_ADMIN si el solicitante no lo es
    if (user.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return apiError('Sin permisos para eliminar un Super Administrador', 403);
    }

    await prisma.user.delete({ where: { id: params.id } });
    await logAudit('DELETE', 'User', params.id, user.companyId || params.id, session.user.id);

    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
