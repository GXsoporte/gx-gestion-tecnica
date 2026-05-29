import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter = from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
          },
        }
      : {};

    const numero = searchParams.get('numero')?.trim() || '';

    if (type === 'tickets') {
      const tickets = await prisma.ticket.findMany({
        where: {
          ...filter,
          ...dateFilter,
          ...(numero ? { ticketNumber: { contains: numero } } : {}),
        },
        include: {
          client: { select: { companyName: true } },
          assignedTo: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return apiResponse(tickets);
    }

    if (type === 'actividades') {
      const activities = await prisma.activity.findMany({
        where: {
          ...filter,
          ...dateFilter,
          ...(numero ? { activityNumber: { contains: numero } } : {}),
        },
        include: {
          client: { select: { companyName: true } },
          technician: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return apiResponse(activities);
    }

    if (type === 'inventario') {
      const assets = await prisma.asset.findMany({
        where: {
          ...filter,
          ...(numero ? { assetNumber: { contains: numero } } : {}),
        },
        include: { client: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return apiResponse(assets);
    }

    if (type === 'monthly') {
      const [tickets, activities] = await Promise.all([
        prisma.ticket.findMany({
          where: { ...filter, ...dateFilter },
          select: { createdAt: true, status: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.activity.findMany({
          where: { ...filter, ...dateFilter },
          select: { createdAt: true, status: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      type MonthEntry = {
        year: number; month: number;
        tickets: number; resueltos: number;
        actividades: number; completadas: number;
      };
      const monthMap = new Map<string, MonthEntry>();

      const getKey = (date: Date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      const ensure = (date: Date) => {
        const key = getKey(date);
        if (!monthMap.has(key)) {
          const d = new Date(date);
          monthMap.set(key, { year: d.getFullYear(), month: d.getMonth(), tickets: 0, resueltos: 0, actividades: 0, completadas: 0 });
        }
        return key;
      };

      for (const t of tickets) {
        const key = ensure(t.createdAt);
        const m = monthMap.get(key)!;
        m.tickets++;
        if (['RESOLVED', 'CLOSED'].includes(t.status)) m.resueltos++;
      }
      for (const a of activities) {
        const key = ensure(a.createdAt);
        const m = monthMap.get(key)!;
        m.actividades++;
        if (a.status === 'COMPLETED') m.completadas++;
      }

      const monthly = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, d]) => ({
          mes: `${MONTH_NAMES[d.month]} ${d.year}`,
          tickets: d.tickets,
          ticketsResueltos: d.resueltos,
          tasaResolucion: d.tickets > 0 ? Math.round((d.resueltos / d.tickets) * 100) : 0,
          actividades: d.actividades,
          actividadesCompletadas: d.completadas,
        }));

      return apiResponse(monthly);
    }

    if (type === 'tecnicos') {
      // Técnicos y clientes solo ven su propio perfil si corresponde
      const techWhere: any = { ...filter, role: 'TECHNICIAN' };
      if (session.user.role === 'TECHNICIAN') techWhere.id = session.user.id;

      const technicians = await prisma.user.findMany({
        where: techWhere,
        include: {
          _count: {
            select: { activities: true, assignedTickets: true },
          },
          timeEntries: {
            select: { minutes: true },
          },
        },
      });

      const report = technicians.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        totalActivities: t._count.activities,
        totalTickets: t._count.assignedTickets,
        totalMinutes: t.timeEntries.reduce((acc, e) => acc + e.minutes, 0),
      }));

      return apiResponse(report);
    }

    // Summary report
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      totalActivities,
      completedActivities,
      totalAssets,
      totalClients,
      ticketsByStatus,
      ticketsByPriority,
    ] = await Promise.all([
      prisma.ticket.count({ where: { ...filter, ...dateFilter } }),
      prisma.ticket.count({ where: { ...filter, status: 'OPEN', ...dateFilter } }),
      prisma.ticket.count({ where: { ...filter, status: { in: ['RESOLVED', 'CLOSED'] }, ...dateFilter } }),
      prisma.activity.count({ where: { ...filter, ...dateFilter } }),
      prisma.activity.count({ where: { ...filter, status: 'COMPLETED', ...dateFilter } }),
      prisma.asset.count({ where: { ...filter } }),
      prisma.client.count({ where: { ...filter } }),
      prisma.ticket.groupBy({ by: ['status'], where: { ...filter, ...dateFilter }, _count: true }),
      prisma.ticket.groupBy({ by: ['priority'], where: { ...filter, ...dateFilter }, _count: true }),
    ]);

    return apiResponse({
      totalTickets,
      openTickets,
      resolvedTickets,
      totalActivities,
      completedActivities,
      totalAssets,
      totalClients,
      ticketsByStatus,
      ticketsByPriority,
      resolutionRate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
      activityCompletionRate: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
    });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
