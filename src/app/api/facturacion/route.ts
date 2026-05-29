import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { z } from 'zod';

const itemSchema = z.object({
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.number().positive('Cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'Precio no puede ser negativo'),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Cliente requerido'),
  dueDate: z.string().min(1, 'Fecha de vencimiento requerida'),
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().default('COP'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Al menos un ítem requerido'),
});

const db = prisma as any;

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    // Facturación es SIEMPRE privada por empresa — ni SUPER_ADMIN ve lo de otras
    const companyId = session.user.companyId;
    if (!companyId) return apiResponse([]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { companyId };
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { client: { companyName: { contains: search } } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: { select: { companyName: true, contactName: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse(invoices);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'COMPANY_ADMIN') {
      return apiError('Solo administradores pueden crear facturas', 403);
    }
    const companyId = session.user.companyId;
    if (!companyId) return apiError('Usuario sin empresa asignada', 403);

    const body = await req.json();
    const data = invoiceSchema.parse(body);

    const invoiceNumber = await nextNumber('FAC', db.invoice, 'invoiceNumber', { companyId });

    const subtotal = data.items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.clientId,
        companyId,
        createdById: session.user.id,
        dueDate: new Date(data.dueDate),
        subtotal,
        taxRate: data.taxRate,
        taxAmount,
        total,
        currency: data.currency,
        notes: data.notes,
        terms: data.terms,
        items: {
          create: data.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        client: { select: { companyName: true, contactName: true } },
        items: true,
      },
    });

    await logAudit('CREATE', 'Invoice', invoice.id, companyId, session.user.id);
    return apiResponse(invoice, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
