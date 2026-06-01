import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { notifyClientCredentials } from '@/lib/notifications';
import { z } from 'zod';

const db = prisma as any;

const platformSchema = z.object({
  name:     z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
});

const userSchema = z.object({
  name:           z.string().min(1, 'El nombre es requerido'),
  cargo:          z.string().optional(),
  phone:          z.string().optional(),
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
  assetIds:       z.array(z.string()).optional(),
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
      include: {
        assets: {
          select: { id: true, assetNumber: true, brand: true, model: true, type: true, status: true },
        },
      },
    });

    const parsed = users.map((u: any) => ({
      ...u,
      platforms: u.platforms ? JSON.parse(u.platforms) : [],
    }));

    return apiResponse(parsed);
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

    const { platforms, assetIds, ...rest } = data;
    const user = await db.clientUser.create({
      data: {
        ...rest,
        platforms: platforms ? JSON.stringify(platforms) : null,
        clientId:  params.id,
        companyId: client.companyId,
      },
    });

    // Asignar activos seleccionados
    if (assetIds && assetIds.length > 0) {
      await prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data:  { clientUserId: user.id },
      });
    }

    // Auto-crear User para acceso al portal si tiene email1
    if (data.email1) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: data.email1 } });
        if (!existing) {
          const rawPassword = Math.random().toString(36).slice(2, 10);
          const hashedPassword = await bcrypt.hash(rawPassword, 10);
          await prisma.user.create({
            data: {
              name: data.name,
              email: data.email1,
              password: hashedPassword,
              role: 'CLIENT',
              companyId: client.companyId,
              isActive: true,
            },
          });
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await notifyClientCredentials({ name: data.name, email: data.email1, rawPassword, appUrl });
        }
      } catch (userErr) {
        console.warn('[clientUser POST] No se pudo crear el User portal:', userErr);
      }
    }

    await logAudit('CREATE', 'ClientUser', user.id, client.companyId, session.user.id);
    return apiResponse(user, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
