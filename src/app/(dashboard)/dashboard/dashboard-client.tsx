'use client';

import { Session } from 'next-auth';
import Link from 'next/link';
import {
  Ticket,
  ClipboardList,
  Monitor,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  cn,
  formatDate,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
} from '@/lib/utils';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

interface DashboardClientProps {
  data: any;
  session: Session;
}

export function DashboardClient({ data, session }: DashboardClientProps) {
  const { stats, recentTickets, recentActivities, ticketsByType, upcomingMaintenances } = data;

  const weekData = [
    { day: 'Lun', tickets: 4, actividades: 6 },
    { day: 'Mar', tickets: 7, actividades: 9 },
    { day: 'Mié', tickets: 5, actividades: 7 },
    { day: 'Jue', tickets: 8, actividades: 11 },
    { day: 'Vie', tickets: 6, actividades: 8 },
    { day: 'Sáb', tickets: 2, actividades: 3 },
    { day: 'Dom', tickets: 1, actividades: 2 },
  ];

  const pieData = ticketsByType.map((t: any) => ({
    name: TICKET_TYPE_LABELS[t.type] || t.type,
    value: t.count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${session.user.name?.split(' ')[0]} 👋`}
        description="Resumen general del sistema de gestión técnica"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Tickets"
          value={stats.totalTickets}
          icon={Ticket}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-500/10"
          trend={{ value: 12, label: 'vs mes anterior', positive: true }}
        />
        <StatCard
          title="Abiertos"
          value={stats.openTickets}
          icon={AlertCircle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50 dark:bg-orange-500/10"
          description={`${stats.inProgressTickets} en proceso`}
        />
        <StatCard
          title="Resueltos"
          value={stats.resolvedTickets}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-50 dark:bg-green-500/10"
          trend={{ value: 8, label: 'esta semana', positive: true }}
        />
        <StatCard
          title="Actividades"
          value={stats.totalActivities}
          icon={ClipboardList}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-500/10"
          description={`${stats.pendingActivities} pendientes`}
        />
        <StatCard
          title="Activos"
          value={stats.totalAssets}
          icon={Monitor}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-50 dark:bg-cyan-500/10"
          description={`${stats.maintenanceAssets} en mantenimiento`}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-100 text-sm font-medium">Tasa de resolución</p>
            <CheckCircle2 className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-4xl font-bold mb-1">
            {stats.totalTickets > 0
              ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100)
              : 0}%
          </p>
          <p className="text-blue-200 text-xs">Tickets resueltos vs total</p>
          <div className="mt-4 bg-blue-500/30 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{
                width: `${stats.totalTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-green-100 text-sm font-medium">Actividades completadas</p>
            <ClipboardList className="w-5 h-5 text-green-200" />
          </div>
          <p className="text-4xl font-bold mb-1">{stats.completedActivities}</p>
          <p className="text-green-200 text-xs">
            {stats.pendingActivities} aún pendientes
          </p>
          <div className="mt-4 bg-green-500/30 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{
                width: `${stats.totalActivities > 0 ? Math.round((stats.completedActivities / stats.totalActivities) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-300 text-sm font-medium">Clientes activos</p>
            <Users className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-4xl font-bold mb-1">{stats.totalClients}</p>
          <p className="text-slate-400 text-xs">{stats.maintenanceAssets} equipos en mantenimiento</p>
          <div className="mt-4 flex gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-slate-300 text-xs">{stats.totalAssets - stats.maintenanceAssets} activos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span className="text-slate-300 text-xs">{stats.maintenanceAssets} en mtto.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad semanal */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="section-title">Actividad semanal</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Tickets y actividades por día</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} barSize={8} barCategoryGap={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="tickets" fill="#3B82F6" name="Tickets" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actividades" fill="#10B981" name="Actividades" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">Tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Actividades</span>
            </div>
          </div>
        </div>

        {/* Tickets por tipo */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
          <div className="mb-6">
            <h3 className="section-title">Tickets por tipo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribución actual</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos disponibles
            </div>
          )}
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0, 4).map((item: any, i: number) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tablas recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets recientes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="section-title">Tickets recientes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos {recentTickets.length} tickets</p>
            </div>
            <Link
              href="/tickets"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentTickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No hay tickets recientes
              </div>
            ) : (
              recentTickets.map((ticket: any) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-start gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className={cn(
                          'badge',
                          TICKET_STATUS_COLORS[ticket.status]
                        )}
                      >
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ticket.client?.companyName} · {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'badge flex-shrink-0',
                      PRIORITY_COLORS[ticket.priority]
                    )}
                  >
                    {PRIORITY_LABELS[ticket.priority]}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: actividades + mantenimientos */}
        <div className="space-y-6">
          {/* Actividades recientes */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="section-title">Actividades recientes</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Últimas actividades</p>
              </div>
              <Link
                href="/actividades"
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentActivities.slice(0, 4).map((activity: any) => (
                <Link
                  key={activity.id}
                  href={`/actividades/${activity.id}`}
                  className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-muted-foreground">
                        {activity.activityNumber}
                      </span>
                      <span
                        className={cn(
                          'badge',
                          ACTIVITY_STATUS_COLORS[activity.status]
                        )}
                      >
                        {ACTIVITY_STATUS_LABELS[activity.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.technician?.name} · {activity.client?.companyName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Próximos mantenimientos */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="section-title">Próximos mantenimientos</h3>
              </div>
              <Link
                href="/mantenimientos"
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {upcomingMaintenances.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No hay mantenimientos programados
                </div>
              ) : (
                upcomingMaintenances.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-9 h-9 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.client?.companyName} · {m.technician?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(m.scheduledDate)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
