import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const assetSchema = z.object({
  type: z.enum(['DESKTOP', 'LAPTOP', 'SERVER', 'PRINTER', 'NETWORK_DEVICE', 'CAMERA', 'PHONE', 'TABLET', 'UPS', 'MONITOR', 'SCANNER', 'OTHER']),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  assignedUser: z.string().optional(),
  area: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'DIAGNOSIS', 'BORROWED', 'DAMAGED', 'RETIRED']).default('ACTIVE'),
  processor: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  operatingSystem: z.string().optional(),
  softwareList: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  purchasePrice: z.number().optional(),
  observations: z.string().optional(),
  clientId: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');

    const where: any = { ...filter };
    if (status) where.status = status;
    if (type) where.type = type;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { assetNumber: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { serial: { contains: search } },
        { assignedUser: { contains: search } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        _count: { select: { tickets: true, activities: true, maintenances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse(assets);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = assetSchema.parse(body);

    const companyFilter = session.user.companyId ? { companyId: session.user.companyId } : undefined;
    const assetNumber = await nextNumber('GX-AST', prisma.asset, 'assetNumber', companyFilter);

    const asset = await prisma.asset.create({
      data: {
        ...data,
        assetNumber,
        companyId: session.user.companyId!,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      },
      include: {
        client: { select: { companyName: true } },
      },
    });

    await logAudit('CREATE', 'Asset', asset.id, session.user.companyId!, session.user.id);

    return apiResponse(asset, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
