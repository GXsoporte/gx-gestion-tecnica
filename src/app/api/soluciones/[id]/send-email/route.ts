import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { notifySolutionToClient } from '@/lib/notifications';

const db = prisma as any;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);
    const companyId = filter.companyId ?? session.user.companyId ?? '__NO_COMPANY__';

    const solution = await db.solution.findFirst({
      where: { id: params.id, ...filter },
      include: {
        ticket:     { select: { ticketNumber: true, subject: true } },
        asset:      { select: { brand: true, model: true, serial: true } },
        client:     { select: { companyName: true, email: true, contactName: true } },
        technician: { select: { name: true } },
        company:    { select: { name: true } },
      },
    });

    if (!solution) return apiError('Solución no encontrada', 404);
    if (!solution.client?.email) return apiError('El cliente no tiene correo registrado', 400);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await notifySolutionToClient({
      solutionNumber: solution.solutionNumber,
      clientName:     solution.client.companyName,
      clientEmail:    solution.client.email,
      technicianName: solution.technician?.name ?? 'Técnico GX',
      ticketNumber:   solution.ticket?.ticketNumber ?? '',
      ticketSubject:  solution.ticket?.subject ?? '',
      assetInfo:      [solution.asset?.brand, solution.asset?.model].filter(Boolean).join(' ') || 'Sin especificar',
      activitiesDone: solution.activitiesDone,
      finalResult:    solution.finalResult,
      recommendations: solution.recommendations,
      appUrl,
    });

    await logAudit('UPDATE', 'Solution', params.id, companyId, session.user.id);

    return apiResponse({ sent: true, email: solution.client.email });
  } catch (e: any) {
    return apiError('Error al enviar correo: ' + e.message, 500);
  }
}
