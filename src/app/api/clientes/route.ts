import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const clientSchema = z.object({
  clientType:  z.enum(['COMPANY', 'NATURAL']).default('COMPANY'),
  companyName: z.string().min(1),
  nit:         z.string().optional(),
  cedula:      z.string().optional(),
  contactName: z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  country:     z.string().default('Colombia'),
  status:      z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  observations: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where: any = { ...filter };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { email: { contains: search } },
        { nit: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: {
          select: { tickets: true, activities: true, assets: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    return apiResponse(clients);
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
    const data = clientSchema.parse(body);

    const count = await prisma.client.count({
      where: { companyId: session.user.companyId || undefined },
    });
    const code = `CLI-${String(count + 1).padStart(6, '0')}`;

    const client = await prisma.client.create({
      data: {
        ...data,
        code,
        companyId: session.user.companyId!,
      },
    });

    await logAudit('CREATE', 'Client', client.id, session.user.companyId!, session.user.id);

    return apiResponse(client, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}
