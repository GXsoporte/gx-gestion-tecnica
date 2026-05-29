import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const adminUserSchema = z.object({
  name:     z.string().min(2, 'Nombre requerido'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

const empresaSchema = z.object({
  name:      z.string().min(2, 'Nombre requerido'),
  slug:      z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  nit:       z.string().optional(),
  logo:      z.string().nullable().optional(),
  email:     z.string().email('Email inválido').optional().or(z.literal('')),
  phone:     z.string().optional(),
  address:   z.string().optional(),
  city:      z.string().optional(),
  country:   z.string().default('Colombia'),
  plan:      z.enum(['TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']).default('BASIC'),
  isActive:  z.boolean().default(true),
  adminUser: adminUserSchema.optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const plan = searchParams.get('plan');
    const status = searchParams.get('status');

    const where: any = {};
    if (plan) where.plan = plan;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { nit: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: { select: { users: true, clients: true, tickets: true } },
      },
      orderBy: { name: 'asc' },
    });

    return apiResponse(companies);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const body = await req.json();
    const { adminUser, ...companyFields } = empresaSchema.parse(body);

    // Verificar slug único
    const existingSlug = await prisma.company.findUnique({ where: { slug: companyFields.slug } });
    if (existingSlug) return apiError('Ya existe una empresa con ese subdominio', 400);

    // Verificar email del admin si se va a crear
    if (adminUser) {
      const existingUser = await prisma.user.findUnique({ where: { email: adminUser.email } });
      if (existingUser) return apiError(`El email "${adminUser.email}" ya está registrado`, 400);
    }

    // Crear empresa y usuario admin en una sola transacción
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: companyFields });

      let adminRecord = null;
      if (adminUser) {
        const hashedPassword = await bcrypt.hash(adminUser.password, 12);
        adminRecord = await tx.user.create({
          data: {
            name:      adminUser.name,
            email:     adminUser.email,
            password:  hashedPassword,
            role:      'COMPANY_ADMIN',
            isActive:  true,
            companyId: company.id,
          },
          select: { id: true, name: true, email: true, role: true },
        });
      }

      return { company, adminUser: adminRecord };
    });

    await logAudit('CREATE', 'Company', result.company.id, result.company.id, session.user.id);

    return apiResponse(result, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}
