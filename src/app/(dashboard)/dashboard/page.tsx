import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardClient } from './dashboard-client';
import { ClientDashboard } from './client-dashboard';

export const metadata = { title: 'Dashboard' };

async function getDashboardData(companyId: string, role: string) {
  const where = role === 'SUPER_ADMIN' ? {} : { companyId };

  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    totalActivities,
    pendingActivities,
    completedActivities,
    totalAssets,
    maintenanceAssets,
    totalClients,
    upcomingMaintenances,
    recentTickets,
    recentActivities,
    ticketsByType,
    activitiesByTechnician,
  ] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: 'OPEN' } }),
    prisma.ticket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } } }),
    prisma.activity.count({ where }),
    prisma.activity.count({ where: { ...where, status: 'PENDING' } }),
    prisma.activity.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.asset.count({ where }),
    prisma.asset.count({ where: { ...where, status: 'MAINTENANCE' } }),
    prisma.client.count({ where }),
    prisma.maintenance.findMany({
      where: {
        ...where,
        status: 'SCHEDULED',
        scheduledDate: { gte: new Date() },
      },
      take: 5,
      orderBy: { scheduledDate: 'asc' },
      include: { client: true, technician: { select: { name: true } } },
    }),
    prisma.ticket.findMany({
      where,
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { companyName: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.activity.findMany({
      where,
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { companyName: true } },
        technician: { select: { name: true } },
      },
    }),
    prisma.ticket.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    }),
    prisma.activity.groupBy({
      by: ['technicianId'],
      where: { ...where, status: 'COMPLETED' },
      _count: { technicianId: true },
      orderBy: { _count: { technicianId: 'desc' } },
      take: 5,
    }),
  ]);

  return {
    stats: {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      totalActivities,
      pendingActivities,
      completedActivities,
      totalAssets,
      maintenanceAssets,
      totalClients,
    },
    upcomingMaintenances: upcomingMaintenances.map((m) => ({
      ...m,
      scheduledDate: m.scheduledDate.toISOString(),
    })),
    recentTickets: recentTickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      closedAt: t.closedAt?.toISOString() || null,
      dueDate: t.dueDate?.toISOString() || null,
    })),
    recentActivities: recentActivities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      startTime: a.startTime?.toISOString() || null,
      endTime: a.endTime?.toISOString() || null,
    })),
    ticketsByType: ticketsByType.map((t) => ({
      type: t.type,
      count: t._count.type,
    })),
  };
}

async function getClientDashboardData(userEmail: string, companyId: string) {
  // Busca el Client cuyo email = userEmail
  let clientId: string | null = null;

  const clientByEmail = await prisma.client.findFirst({
    where: { email: userEmail, companyId },
  });

  if (clientByEmail) {
    clientId = clientByEmail.id;
  } else {
    // Busca ClientUser donde email1 = userEmail
    const clientUser = await prisma.clientUser.findFirst({
      where: { email1: userEmail, companyId },
    });
    if (clientUser) {
      clientId = clientUser.clientId;
    }
  }

  if (!clientId) {
    return {
      totalTickets: 0,
      openTickets: 0,
      pendingDiagnoses: 0,
      recentTickets: [],
      pendingDiagnosesList: [],
    };
  }

  const [totalTickets, openTickets, pendingDiagnoses, recentTickets, pendingDiagnosesList] =
    await Promise.all([
      prisma.ticket.count({ where: { clientId } }),
      prisma.ticket.count({ where: { clientId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.diagnosis.count({ where: { clientId, status: 'SENT' } }),
      prisma.ticket.findMany({
        where: { clientId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: { select: { name: true } } },
      }),
      prisma.diagnosis.findMany({
        where: { clientId, status: 'SENT' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { ticket: { select: { subject: true } } },
      }),
    ]);

  return {
    totalTickets,
    openTickets,
    pendingDiagnoses,
    recentTickets: recentTickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      closedAt: t.closedAt?.toISOString() || null,
      dueDate: t.dueDate?.toISOString() || null,
    })),
    pendingDiagnosesList: pendingDiagnosesList.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      sentAt: d.sentAt?.toISOString() || null,
      approvedAt: d.approvedAt?.toISOString() || null,
      rejectedAt: d.rejectedAt?.toISOString() || null,
    })),
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  if (session.user.role === 'CLIENT') {
    const clientData = await getClientDashboardData(
      session.user.email!,
      session.user.companyId || ''
    );
    return <ClientDashboard data={clientData} session={session} />;
  }

  const data = await getDashboardData(
    session.user.companyId || '',
    session.user.role
  );

  return <DashboardClient data={data} session={session} />;
}
