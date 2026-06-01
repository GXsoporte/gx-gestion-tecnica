import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const solutionSchema = z.object({
  ticketId: z.string().min(1),
  diagnosisId: z.string().min(1),
  assetId: z.string().min(1),
  clientId: z.string().min(1),
  startDate: z.string().optional().nullable(),
  activitiesDone: z.string().optional(),
  spareParts: z.string().optional(),
  installedSoftware: z.string().optional(),
  configurations: z.string().optional(),
  testsDone: z.string().optional(),
  finalResult: z.string().optional(),
  recommendations: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const ticketId = searchParams.get('ticketId');
    const diagnosisId = searchParams.get('diagnosisId');
    const status = searchParams.get('status');

    const where: any = { ...filter };
    if (ticketId) where.ticketId = ticketId;
    if (diagnosisId) where.diagnosisId = diagnosisId;
    if (status) where.status = status;
    if (session.user.role === 'TECHNICIAN') where.technicianId = session.user.id;

    const solutions = await db.solution.findMany({
      where,
      include: {
        ticket: { select: { ticketNumber: true, subject: true } },
        diagnosis: { select: { diagnosisNumber: true } },
        asset: { select: { brand: true, model: true, serial: true } },
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiResponse(solutions);
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
    const data = solutionSchema.parse(body);

    // Validar que el diagnóstico esté APROBADO
    const diagnosis = await db.diagnosis.findFirst({
      where: { id: data.diagnosisId, companyId },
    });
    if (!diagnosis) return apiError('Diagnóstico no encontrado', 404);
    if (diagnosis.status !== 'APPROVED') return apiError('El diagnóstico debe estar aprobado para crear una solución', 400);

    const solutionNumber = await nextNumber('SL', db.solution, 'solutionNumber', { companyId });

    const solution = await db.solution.create({
      data: {
        ...data,
        solutionNumber,
        companyId,
        technicianId: session.user.id, // siempre el usuario que crea la solución
        status: 'IN_PROGRESS',
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
      },
      include: {
        ticket: { select: { ticketNumber: true } },
        diagnosis: { select: { diagnosisNumber: true } },
        asset: { select: { brand: true, model: true } },
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
    });

    // Marcar diagnóstico como COMPLETADO y archivar el ticket
    await db.diagnosis.update({
      where: { id: data.diagnosisId },
      data:  { status: 'COMPLETED', completedAt: new Date() },
    });

    await db.ticket.update({
      where: { id: data.ticketId },
      data:  { status: 'ARCHIVED' },
    });

    await logAudit('CREATE', 'Solution', solution.id, companyId, session.user.id);
    return apiResponse(solution, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
