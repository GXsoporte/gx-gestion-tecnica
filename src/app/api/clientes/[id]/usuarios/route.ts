import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const userSchema = z.object({
  name:           z.string().min(1, 'El nombre es requerido'),
  pcUsername:     z.string().optional(),
  pcPassword:     z.string().optional(),
  adminUsername:  z.string().optional(),
  adminPassword:  z.string().optional(),
  email1:         z.string().optional(),
  email1Password: z.string().optional(),
  email2:         z.string().optional(),
  email2Password: z.string().optional(),
  notes:          z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter  = getCompanyFilter(session);

    const client = await prisma.client.findFirst({ where: { id: params.id, ...filter } });
    if (!client) return apiError('Cliente no encontrado', 404);

    const users = await db.clientUser.findMany({
      where:   { clientId: params.id },
      orderBy: { createdAt: 'asc' },
    });

    return apiResponse(users);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);

    const client = await prisma.client.findFirst({ where: { id: params.id, ...filter } });
    if (!client) return apiError('Cliente no encontrado', 404);

    const body = await req.json();
    const data = userSchema.parse(body);

    const user = await db.clientUser.create({
      data: {
        ...data,
        clientId:  params.id,
        companyId: client.companyId,
      },
    });

    await logAudit('CREATE', 'ClientUser', user.id, client.companyId, session.user.id);
    return apiResponse(user, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
