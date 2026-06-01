'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Ticket, Clock, Loader2 } from 'lucide-react';
import { cn, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, TICKET_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PortalTicketsClient() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['portal-tickets'],
    queryFn: async () => {
      const { data } = await axios.get('/api/portal/mis-tickets');
      return data.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="w-6 h-6 text-primary" />
          Mis tickets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historial de solicitudes de soporte técnico.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-border">
          <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tienes tickets registrados aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: any) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono font-bold text-primary text-sm">{t.ticketNumber}</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', TICKET_STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                      {TICKET_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', PRIORITY_COLORS[t.priority] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                      {PRIORITY_LABELS[t.priority] ?? t.priority}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">{t.subject}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>{TICKET_TYPE_LABELS[t.type] ?? t.type}</span>
                    {t.assignedTo?.name && <span>Técnico: {t.assignedTo.name}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtDate(t.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              {t.description && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{t.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
