import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { notifyDiagnosisToClient } from '@/lib/notifications';

const db = prisma as any;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(session.user.role)) {
      return apiError('Sin permisos', 403);
    }
    const filter = getCompanyFilter(session);
    const companyId = filter.companyId ?? session.user.companyId ?? '__NO_COMPANY__';

    const diagnosis = await db.diagnosis.findFirst({
      where: { id: params.id, ...filter },
      include: {
        ticket:     { select: { ticketNumber: true, subject: true } },
        asset:      { select: { brand: true, model: true, serial: true } },
        client:     { select: { companyName: true, email: true, contactName: true } },
        technician: { select: { name: true } },
      },
    });

    if (!diagnosis) return apiError('Diagnóstico no encontrado', 404);
    if (!diagnosis.client?.email) return apiError('El cliente no tiene correo registrado', 400);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await notifyDiagnosisToClient({
      diagnosisNumber: diagnosis.diagnosisNumber,
      clientName:      diagnosis.client.companyName,
      clientEmail:     diagnosis.client.email,
      technicianName:  diagnosis.technician?.name ?? 'Técnico GX',
      ticketNumber:    diagnosis.ticket?.ticketNumber ?? '',
      ticketSubject:   diagnosis.ticket?.subject ?? '',
      assetInfo:       [diagnosis.asset?.brand, diagnosis.asset?.model].filter(Boolean).join(' ') || 'Sin especificar',
      description:     diagnosis.description,
      problemCause:    diagnosis.problemCause,
      recommendation:  diagnosis.recommendation,
      estimatedCost:   diagnosis.estimatedCost,
      estimatedTime:   diagnosis.estimatedTime,
      requiresRepair:  diagnosis.requiresRepair,
      appUrl,
    });

    // Cambiar estado a SENT y registrar fecha
    const updated = await db.diagnosis.update({
      where: { id: params.id },
      data:  { status: 'SENT', sentAt: new Date() },
    });

    // Sincronizar ticket
    if (diagnosis.ticketId) {
      await db.ticket.update({
        where: { id: diagnosis.ticketId },
        data:  { status: 'DIAGNOSIS_SENT' },
      }).catch(() => {});
    }

    await logAudit('UPDATE', 'Diagnosis', params.id, companyId, session.user.id);

    return apiResponse({ sent: true, status: 'SENT', email: diagnosis.client.email });
  } catch (e: any) {
    if (e.message?.includes('diagnóstico')) return apiError(e.message, 400);
    return apiError('Error al enviar correo: ' + e.message, 500);
  }
}
