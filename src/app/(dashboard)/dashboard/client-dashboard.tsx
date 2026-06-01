'use client';

import { Session } from 'next-auth';
import Link from 'next/link';
import { Ticket, AlertCircle, ClipboardCheck, ArrowRight, FileSearch } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { cn, formatDate, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils';

interface ClientDashboardProps {
  data: {
    totalTickets: number;
    openTickets: number;
    pendingDiagnoses: number;
    recentTickets: any[];
    pendingDiagnosesList: any[];
  };
  session: Session;
}

export function ClientDashboard({ data, session }: ClientDashboardProps) {
  const { totalTickets, openTickets, pendingDiagnoses, recentTickets, pendingDiagnosesList } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${session.user.name?.split(' ')[0]}`}
        description="Resumen de tu estado de soporte técnico"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Mis Tickets"
          value={totalTickets}
          icon={Ticket}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatCard
          title="Tickets Abiertos"
          value={openTickets}
          icon={AlertCircle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50 dark:bg-orange-500/10"
        />
        <StatCard
          title="Diagnósticos pendientes"
          value={pendingDiagnoses}
          icon={ClipboardCheck}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 dark:bg-teal-500/10"
          description="Requieren su aprobación"
        />
      </div>

      {/* Diagnósticos pendientes de aprobación */}
      {pendingDiagnosesList.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                Diagnósticos pendientes de aprobación
              </h3>
            </div>
            <Link
              href="/diagnosticos"
              className="text-xs text-amber-700 dark:text-amber-400 font-medium hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingDiagnosesList.slice(0, 3).map((d: any) => (
              <Link
                key={d.id}
                href={`/diagnosticos/${d.id}`}
                className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-colors"
              >
                <div>
                  <span className="text-xs font-mono text-muted-foreground">{d.diagnosisNumber}</span>
                  <p className="text-sm font-medium text-foreground">{d.ticket?.subject || 'Diagnóstico técnico'}</p>
                </div>
                <span className="text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full font-medium">
                  Pendiente
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Últimos tickets */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="section-title">Mis tickets recientes</h3>
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
              No tienes tickets registrados
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
                    <span className={cn('badge', TICKET_STATUS_COLORS[ticket.status])}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(ticket.createdAt)}
                    {ticket.assignedTo?.name ? ` · ${ticket.assignedTo.name}` : ''}
                  </p>
                </div>
                <span className={cn('badge flex-shrink-0', PRIORITY_COLORS[ticket.priority])}>
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
