import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError, nextNumber } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const db = prisma as any;

const createSchema = z.object({
  // Datos del usuario
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  // Datos del vendedor
  commission: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const vendors = await db.vendor.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
        },
        assignedCompanies: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiResponse(vendors);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const body = await req.json();
    const data = createSchema.parse(body);

    // Verificar que el email no esté en uso
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return apiError('Ya existe un usuario con ese email', 400);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const vendorNumber = await nextNumber('VEN', db.vendor, 'vendorNumber');

    // Crear usuario y vendedor en una transacción
    const vendor = await (prisma as any).$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          phone: data.phone,
          role: 'VENDOR',
          isActive: true,
          // Sin companyId — los vendedores son del sistema
        },
      });

      const v = await tx.vendor.create({
        data: {
          vendorNumber,
          userId: user.id,
          commission: data.commission,
          notes: data.notes,
          isActive: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          assignedCompanies: true,
        },
      });

      return v;
    });

    return apiResponse(vendor, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
