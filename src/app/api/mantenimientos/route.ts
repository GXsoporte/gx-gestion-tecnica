import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const maintenanceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE']),
  scheduledDate: z.string(),
  clientId: z.string(),
  assetId: z.string().optional(),
  technicianId: z.string(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');

    const where: any = { ...filter };
    if (status) where.status = status;
    if (type) where.type = type;
    if (clientId) where.clientId = clientId;
    if (session.user.role === 'TECHNICIAN') where.technicianId = session.user.id;

    const maintenances = await prisma.maintenance.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        asset: { select: { id: true, brand: true, model: true, serial: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return apiResponse(maintenances);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = maintenanceSchema.parse(body);

    const maintenance = await prisma.maintenance.create({
      data: {
        ...data,
        status: 'SCHEDULED',
        companyId: session.user.companyId!,
        scheduledDate: new Date(data.scheduledDate),
      },
      include: {
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
    });

    await logAudit('CREATE', 'Maintenance', maintenance.id, session.user.companyId!, session.user.id);
    return apiResponse(maintenance, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
