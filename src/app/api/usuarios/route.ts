import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN', 'CLIENT']),
  phone: z.string().optional(),
  position: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }

    const { searchParams } = new URL(req.url);
    const roleParam    = searchParams.get('role');       // filtrar por un rol específico
    const companyParam = searchParams.get('companyId');  // solo SUPER_ADMIN puede usar esto
    const activeOnly   = searchParams.get('active') !== 'false'; // por defecto solo activos

    // Base de aislamiento por empresa
    let companyFilter: Record<string, any>;
    if (session.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN puede restringir a una empresa específica vía query param
      companyFilter = companyParam ? { companyId: companyParam } : {};
    } else {
      // Cualquier otro rol SIEMPRE está restringido a su propia empresa
      companyFilter = { companyId: session.user.companyId };
    }

    const where: Record<string, any> = { ...companyFilter };
    if (roleParam)   where.role     = roleParam;
    if (activeOnly)  where.isActive = true;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        position: true,
        lastLogin: true,
        createdAt: true,
        image: true,
      },
      orderBy: { name: 'asc' },
    });

    return apiResponse(users);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }

    const body = await req.json();
    const data = userSchema.parse(body);

    if (data.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return apiError('Sin permisos para crear Super Admin', 403);
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return apiError('El email ya está registrado', 400);

    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 12)
      : await bcrypt.hash('Temporal123!', 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        phone: data.phone,
        position: data.position,
        isActive: data.isActive,
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        position: true,
        createdAt: true,
      },
    });

    return apiResponse(user, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
