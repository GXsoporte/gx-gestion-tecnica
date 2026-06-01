'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Wrench, Clock, Download, X, Ticket, Monitor, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOLUTION_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'En proceso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
};
const SOLUTION_STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED:   'bg-green-50 text-green-700 border-green-200',
  CANCELLED:   'bg-slate-100 text-slate-600 border-slate-200',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function SolutionDetail({ sol, onClose }: { sol: any; onClose: () => void }) {
  const fields: [string, string | undefined | null][] = [
    ['Actividades realizadas', sol.activitiesDone],
    ['Repuestos utilizados', sol.spareParts],
    ['Software instalado', sol.installedSoftware],
    ['Configuraciones', sol.configurations],
    ['Pruebas realizadas', sol.testsDone],
    ['Resultado final', sol.finalResult],
    ['Recomendaciones', sol.recommendations],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <p className="font-mono font-bold text-primary text-sm">{sol.solutionNumber}</p>
            <p className="font-semibold text-foreground">{sol.ticket?.subject ?? '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {sol.ticket?.ticketNumber && (
              <span className="flex items-center gap-1"><Ticket className="w-3 h-3" />{sol.ticket.ticketNumber}</span>
            )}
            {(sol.asset?.brand || sol.asset?.model) && (
              <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{[sol.asset.brand, sol.asset.model].filter(Boolean).join(' ')}</span>
            )}
            {sol.technician?.name && <span>Técnico: {sol.technician.name}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(sol.createdAt)}</span>
          </div>

          {fields.filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 border border-border rounded-lg px-3 py-2">{value}</p>
            </div>
          ))}

          {fields.every(([, v]) => !v) && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin detalles registrados aún.</p>
          )}
        </div>
        <div className="p-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => window.open(`/api/soluciones/${sol.id}/reporte`, '_blank')}
            className="w-full flex items-center justify-center gap-2 border border-border py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar reporte PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function PortalSolucionesClient() {
  const [selected, setSelected] = useState<any | null>(null);

  const { data: solutions = [], isLoading } = useQuery({
    queryKey: ['portal-soluciones'],
    queryFn: async () => {
      const { data } = await axios.get('/api/portal/mis-soluciones');
      return data.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" />
          Mis soluciones
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reparaciones y soluciones técnicas aplicadas a tus equipos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : solutions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-border">
          <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tienes soluciones registradas aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solutions.map((s: any) => (
            <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-bold text-primary text-sm">{s.solutionNumber}</span>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', SOLUTION_STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {SOLUTION_STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{s.ticket?.subject ?? '—'}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {s.ticket?.ticketNumber && (
                        <span className="flex items-center gap-1"><Ticket className="w-3 h-3" />{s.ticket.ticketNumber}</span>
                      )}
                      {(s.asset?.brand || s.asset?.model) && (
                        <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{[s.asset.brand, s.asset.model].filter(Boolean).join(' ')}</span>
                      )}
                      {s.technician?.name && <span>{s.technician.name}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(s.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(s)}
                    className="text-xs text-primary hover:underline font-medium flex-shrink-0"
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <SolutionDetail sol={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
