import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const activitySchema = z.object({
  description: z.string().min(1),
  diagnosis: z.string().optional(),
  solution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  clientId: z.string(),
  technicianId: z.string(),
  ticketId: z.string().optional(),
  assetId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const technicianId = searchParams.get('technicianId');
    const maintenanceId = searchParams.get('maintenanceId');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { ...filter };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (maintenanceId) where.maintenanceId = maintenanceId;
    if (search) {
      where.OR = [
        { activityNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (session.user.role === 'TECHNICIAN') {
      where.technicianId = session.user.id;
    } else if (technicianId) {
      where.technicianId = technicianId;
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        technician: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        asset: { select: { id: true, brand: true, model: true } },
        ticket: { select: { id: true, ticketNumber: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse(activities);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = activitySchema.parse(body);

    const companyFilter = session.user.companyId ? { companyId: session.user.companyId } : undefined;
    const activityNumber = await nextNumber('GX-ACT', prisma.activity, 'activityNumber', companyFilter);

    let totalMinutes: number | undefined;
    if (data.startTime && data.endTime) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }

    const activity = await prisma.activity.create({
      data: {
        activityNumber,
        description: data.description,
        diagnosis: data.diagnosis,
        solution: data.solution,
        priority: data.priority,
        status: 'PENDING',
        clientId: data.clientId,
        technicianId: data.technicianId,
        createdById: session.user.id,
        companyId: session.user.companyId!,
        ticketId: data.ticketId,
        assetId: data.assetId,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        totalMinutes,
      },
      include: {
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
    });

    await logAudit('CREATE', 'Activity', activity.id, session.user.companyId!, session.user.id);

    return apiResponse(activity, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}
