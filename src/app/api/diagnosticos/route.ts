import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const diagSchema = z.object({
  ticketId: z.string().min(1),
  assetId: z.string().min(1),
  clientId: z.string().min(1),
  description: z.string().min(1),
  problemCause: z.string().optional(),
  recommendation: z.string().optional(),
  requiresRepair: z.boolean().default(true),
  estimatedCost: z.number().min(0).optional().nullable(),
  estimatedTime: z.string().optional(),
  technicianNotes: z.string().optional(),
  aiDiagnosisId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const ticketId = searchParams.get('ticketId');
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');

    const where: any = { ...filter };
    if (ticketId) where.ticketId = ticketId;
    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;
    // Technician only sees their own
    if (session.user.role === 'TECHNICIAN') where.technicianId = session.user.id;
    // CLIENT only sees diagnoses linked to their own client record (matched by email)
    if (session.user.role === 'CLIENT') {
      const clientRecord = await db.client.findFirst({
        where: { email: session.user.email, ...filter },
        select: { id: true },
      });
      where.clientId = clientRecord?.id ?? '__NO_CLIENT__';
    }

    const diagnoses = await db.diagnosis.findMany({
      where,
      include: {
        ticket: { select: { ticketNumber: true, subject: true } },
        asset: { select: { brand: true, model: true, serial: true } },
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiResponse(diagnoses);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const companyId = getCompanyFilter(session).companyId ?? '__NO_COMPANY__';

    const body = await req.json();
    const data = diagSchema.parse(body);

    const diagnosisNumber = await nextNumber('DG', db.diagnosis, 'diagnosisNumber', { companyId });

    const diagnosis = await db.diagnosis.create({
      data: {
        ...data,
        diagnosisNumber,
        companyId,
        technicianId: session.user.id,
        status: 'DRAFT',
      },
      include: {
        ticket: { select: { ticketNumber: true, subject: true } },
        asset: { select: { brand: true, model: true } },
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
    });

    await logAudit('CREATE', 'Diagnosis', diagnosis.id, companyId, session.user.id);

    // Actualizar estado del ticket a IN_DIAGNOSIS cuando se crea un diagnóstico
    await db.ticket.update({
      where: { id: data.ticketId },
      data: { status: 'IN_DIAGNOSIS' },
    });

    return apiResponse(diagnosis, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
