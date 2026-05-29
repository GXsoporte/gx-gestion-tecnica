import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError, logAudit } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const updateSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
  })).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const companyId = session.user.companyId;
    if (!companyId) return apiError('Sin empresa asignada', 403);

    const invoice = await db.invoice.findFirst({
      where: { id: params.id, companyId },
      include: {
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            nit: true,
          },
        },
        items: true,
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) return apiError('Factura no encontrada', 404);
    return apiResponse(invoice);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'COMPANY_ADMIN') return apiError('Sin permisos', 403);
    const companyId = session.user.companyId;
    if (!companyId) return apiError('Sin empresa asignada', 403);

    const existing = await db.invoice.findFirst({ where: { id: params.id, companyId } });
    if (!existing) return apiError('Factura no encontrada', 404);

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;

    if (data.items) {
      const subtotal = data.items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
      const taxRate = data.taxRate ?? existing.taxRate;
      const taxAmount = subtotal * (taxRate / 100);
      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.total = subtotal + taxAmount;

      await (prisma as any).invoiceItem.deleteMany({ where: { invoiceId: params.id } });
      await (prisma as any).invoiceItem.createMany({
        data: data.items.map((item: any) => ({
          invoiceId: params.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      });
    } else if (data.taxRate !== undefined) {
      const taxAmount = existing.subtotal * (data.taxRate / 100);
      updateData.taxRate = data.taxRate;
      updateData.taxAmount = taxAmount;
      updateData.total = existing.subtotal + taxAmount;
    }

    const invoice = await db.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: { select: { companyName: true } },
        items: true,
      },
    });

    await logAudit('UPDATE', 'Invoice', invoice.id, companyId, session.user.id);
    return apiResponse(invoice);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'COMPANY_ADMIN') return apiError('Sin permisos', 403);
    const companyId = session.user.companyId;
    if (!companyId) return apiError('Sin empresa asignada', 403);

    const existing = await db.invoice.findFirst({ where: { id: params.id, companyId } });
    if (!existing) return apiError('Factura no encontrada', 404);

    await db.invoice.delete({ where: { id: params.id } });
    await logAudit('DELETE', 'Invoice', params.id, companyId, session.user.id);
    return apiResponse({ deleted: true });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
