import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter  = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) return apiResponse({ tickets: [], clientes: [], actividades: [], activos: [] });

    const term = { contains: q };

    const [tickets, clientes, actividades, activos] = await Promise.all([
      prisma.ticket.findMany({
        where: {
          ...filter,
          OR: [
            { ticketNumber:  term },
            { subject:       term },
            { requesterName: term },
          ],
        },
        select: {
          id: true, ticketNumber: true, subject: true,
          status: true, priority: true,
          client: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      prisma.client.findMany({
        where: {
          ...filter,
          OR: [
            { companyName: term },
            { contactName: term },
            { email:       term },
            { nit:         term },
          ],
        },
        select: {
          id: true, companyName: true, contactName: true,
          email: true, status: true,
        },
        orderBy: { companyName: 'asc' },
        take: 5,
      }),

      prisma.activity.findMany({
        where: {
          ...filter,
          OR: [
            { activityNumber: term },
            { description:    term },
          ],
        },
        select: {
          id: true, activityNumber: true, description: true,
          status: true,
          client:     { select: { companyName: true } },
          technician: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      prisma.asset.findMany({
        where: {
          ...filter,
          OR: [
            { assetNumber:   term },
            { brand:         term },
            { model:         term },
            { serial:        term },
            { assignedUser:  term },
          ],
        },
        select: {
          id: true, assetNumber: true, brand: true, model: true,
          serial: true, status: true, type: true,
          client: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return apiResponse({ tickets, clientes, actividades, activos });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
