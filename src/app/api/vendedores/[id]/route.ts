import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const updateSchema = z.object({
  commission: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  // Empresas asignadas (lista de companyIds)
  companyIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const vendor = await db.vendor.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        assignedCompanies: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!vendor) return apiError('Vendedor no encontrado', 404);
    return apiResponse(vendor);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const existing = await db.vendor.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('Vendedor no encontrado', 404);

    const body = await req.json();
    const { companyIds, ...rest } = updateSchema.parse(body);

    const updateData: any = {};
    if (rest.commission !== undefined) updateData.commission = rest.commission;
    if (rest.notes !== undefined) updateData.notes = rest.notes;
    if (rest.isActive !== undefined) updateData.isActive = rest.isActive;

    // Si se pasan companyIds, sincronizar las asignaciones
    if (companyIds !== undefined) {
      // Eliminar todas las asignaciones actuales y crear las nuevas
      await db.companyVendor.deleteMany({ where: { vendorId: params.id } });
      if (companyIds.length > 0) {
        await db.companyVendor.createMany({
          data: companyIds.map((companyId: string) => ({
            companyId,
            vendorId: params.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Sincronizar isActive en el usuario
    if (rest.isActive !== undefined) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { isActive: rest.isActive },
      });
    }

    const vendor = await db.vendor.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        assignedCompanies: {
          include: { company: { select: { id: true, name: true } } },
        },
      },
    });

    return apiResponse(vendor);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos', 400);
    return apiError(e.message, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const existing = await db.vendor.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('Vendedor no encontrado', 404);

    // Desactivar en lugar de eliminar para mantener historial
    await db.vendor.update({ where: { id: params.id }, data: { isActive: false } });
    await prisma.user.update({ where: { id: existing.userId }, data: { isActive: false } });

    return apiResponse({ message: 'Vendedor desactivado' });
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
