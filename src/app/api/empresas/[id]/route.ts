import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const updateSchema = z.object({
  name:     z.string().min(2).optional(),
  nit:      z.string().optional(),
  logo:     z.string().nullable().optional(),
  email:    z.string().email().optional().or(z.literal('')),
  phone:    z.string().optional(),
  address:  z.string().optional(),
  city:     z.string().optional(),
  country:  z.string().optional(),
  plan:     z.enum(['TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { users: true, clients: true, tickets: true, activities: true } },
        users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true }, take: 10 },
      },
    });

    if (!company) return apiError('Empresa no encontrada', 404);
    return apiResponse(company);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const isOwnCompany = session.user.companyId === params.id;

    if (!isSuperAdmin && !isOwnCompany) return apiError('Sin permisos', 403);

    const body = await req.json();
    const data = updateSchema.parse(body);

    const old = await prisma.company.findUnique({ where: { id: params.id } });
    if (!old) return apiError('Empresa no encontrada', 404);

    const company = await prisma.company.update({ where: { id: params.id }, data });

    await logAudit('UPDATE', 'Company', company.id, company.id, session.user.id,
      JSON.stringify(old), JSON.stringify(data));

    return apiResponse(company);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const company = await prisma.company.findUnique({ where: { id: params.id } });
    if (!company) return apiError('Empresa no encontrada', 404);

    // Collect IDs of child records so we can cascade deletes manually
    // (schema has no onDelete: Cascade on Company relations)
    const [tickets, activities, assets, maintenances, documents, clients] = await Promise.all([
      prisma.ticket.findMany({ where: { companyId: params.id }, select: { id: true } }),
      prisma.activity.findMany({ where: { companyId: params.id }, select: { id: true } }),
      prisma.asset.findMany({ where: { companyId: params.id }, select: { id: true } }),
      prisma.maintenance.findMany({ where: { companyId: params.id }, select: { id: true } }),
      prisma.document.findMany({ where: { companyId: params.id }, select: { id: true } }),
      prisma.client.findMany({ where: { companyId: params.id }, select: { id: true } }),
    ]);

    const ticketIds      = tickets.map(r => r.id);
    const activityIds    = activities.map(r => r.id);
    const assetIds       = assets.map(r => r.id);
    const maintenanceIds = maintenances.map(r => r.id);
    const documentIds    = documents.map(r => r.id);
    const clientIds      = clients.map(r => r.id);

    await prisma.$transaction(async (tx) => {
      // 1. Audit logs & notifications (both scoped to companyId)
      await tx.auditLog.deleteMany({ where: { companyId: params.id } });
      await tx.notification.deleteMany({ where: { companyId: params.id } });

      // 2. Time entries (linked to company's tickets or activities)
      const teOr: any[] = [];
      if (ticketIds.length)   teOr.push({ ticketId:   { in: ticketIds   } });
      if (activityIds.length) teOr.push({ activityId: { in: activityIds } });
      if (teOr.length) await tx.timeEntry.deleteMany({ where: { OR: teOr } });

      // 3. AI diagnoses (linked to company's activities or assets)
      const aiOr: any[] = [];
      if (activityIds.length) aiOr.push({ activityId: { in: activityIds } });
      if (assetIds.length)    aiOr.push({ assetId:    { in: assetIds    } });
      if (aiOr.length) await tx.aIDiagnosis.deleteMany({ where: { OR: aiOr } });

      // 4. Comments (linked to company's tickets)
      if (ticketIds.length) await tx.comment.deleteMany({ where: { ticketId: { in: ticketIds } } });

      // 5. Attachments (linked to any company record)
      const attOr: any[] = [];
      if (ticketIds.length)      attOr.push({ ticketId:      { in: ticketIds      } });
      if (activityIds.length)    attOr.push({ activityId:    { in: activityIds    } });
      if (assetIds.length)       attOr.push({ assetId:       { in: assetIds       } });
      if (maintenanceIds.length) attOr.push({ maintenanceId: { in: maintenanceIds } });
      if (documentIds.length)    attOr.push({ documentId:    { in: documentIds    } });
      if (attOr.length) await tx.attachment.deleteMany({ where: { OR: attOr } });

      // 6. Activities → Maintenances → Tickets → Assets → Documents
      await tx.activity.deleteMany({ where: { companyId: params.id } });
      await tx.maintenance.deleteMany({ where: { companyId: params.id } });
      await tx.ticket.deleteMany({ where: { companyId: params.id } });
      await tx.asset.deleteMany({ where: { companyId: params.id } });
      await tx.document.deleteMany({ where: { companyId: params.id } });

      // 7. Client contacts (clientId cascade not applied at DB level)
      if (clientIds.length) await tx.clientContact.deleteMany({ where: { clientId: { in: clientIds } } });

      // 8. Clients
      await tx.client.deleteMany({ where: { companyId: params.id } });

      // 9. Users
      await tx.user.deleteMany({ where: { companyId: params.id } });

      // 10. Company itself
      await tx.company.delete({ where: { id: params.id } });
    });

    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
