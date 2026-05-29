import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError, logAudit, nextNumber } from '@/lib/api-helpers';
import { notifyNewTicket } from '@/lib/notifications';
import { z } from 'zod';

const ticketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['HARDWARE', 'SOFTWARE', 'NETWORKS', 'MICROSOFT_365', 'INTERNET', 'PRINTERS', 'SERVER', 'CAMERAS', 'REMOTE_SUPPORT', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  requesterName: z.string().min(1),
  requesterEmail: z.string().email().optional(),
  requesterPhone: z.string().optional(),
  requesterPosition: z.string().optional(),
  clientId: z.string(),
  assignedToId: z.string().optional(),
  relatedAssetId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');
    const assignedToId = searchParams.get('assignedToId');
    const search = searchParams.get('search');

    const where: any = { ...filter };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (clientId) where.clientId = clientId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { ticketNumber: { contains: search } },
        { requesterName: { contains: search } },
      ];
    }

    if (session.user.role === 'CLIENT') {
      const client = await prisma.client.findFirst({
        where: { email: session.user.email, companyId: session.user.companyId || undefined },
      });
      if (client) where.clientId = client.id;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        relatedAsset: { select: { id: true, brand: true, model: true, serial: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return apiResponse(tickets);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = ticketSchema.parse(body);

    const companyFilter = session.user.companyId ? { companyId: session.user.companyId } : undefined;
    const ticketNumber = await nextNumber('GX-TCK', prisma.ticket, 'ticketNumber', companyFilter);

    const ticket = await prisma.ticket.create({
      data: {
        ...data,
        ticketNumber,
        status: 'OPEN',
        companyId: session.user.companyId!,
        createdById: session.user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        client: { select: { companyName: true } },
        assignedTo: { select: { name: true } },
      },
    });

    await logAudit('CREATE', 'Ticket', ticket.id, session.user.companyId!, session.user.id, null, { ticketNumber, status: 'OPEN' });

    // Notificación por email (no bloquea la respuesta)
    notifyNewTicket({
      ticketNumber,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      type: data.type,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      requesterPhone: data.requesterPhone,
      clientName: ticket.client?.companyName,
      companyName: session.user.companyName,
    }).catch((err) => console.error('[tickets] Error en notificación:', err));

    return apiResponse(ticket, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}
