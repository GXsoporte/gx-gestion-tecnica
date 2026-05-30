'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Stethoscope, Plus, Search, CheckCircle2, XCircle,
  Clock, Send, FileText, Eye, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosticoModal } from './diagnostico-modal';
import { DiagnosticoDetail } from './diagnostico-detail';
import { SolucionModal } from '../soluciones/solucion-modal';

/* ─── Config ──────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  DRAFT:          { label: 'Borrador',       text: 'text-gray-600',    bg: 'bg-gray-100'    },
  SENT:           { label: 'Enviado',        text: 'text-blue-700',    bg: 'bg-blue-100'    },
  APPROVED:       { label: 'Aprobado',       text: 'text-emerald-700', bg: 'bg-emerald-100' },
  REJECTED:       { label: 'No aprobado',    text: 'text-red-700',     bg: 'bg-red-100'     },
  INFO_REQUESTED: { label: 'Más info',       text: 'text-amber-700',   bg: 'bg-amber-100'   },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Componente ──────────────────────────────────────────── */
export function DiagnosticosClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const role = session?.user?.role ?? '';

  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [detailDiag, setDetailDiag]             = useState<any>(null);
  const [solutionDiag, setSolutionDiag]         = useState<any>(null); // para pre-fill
  const [search, setSearch]                     = useState('');
  const [statusFilter, setStatusFilter]         = useState('ALL');

  const canCreate = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'].includes(role);

  const { data: diagnoses = [], isLoading } = useQuery({
    queryKey: ['diagnoses', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const { data } = await axios.get(`/api/diagnosticos?${params}`);
      return data.data || [];
    },
  });

  const filtered = search
    ? diagnoses.filter((d: any) =>
        d.diagnosisNumber?.toLowerCase().includes(search.toLowerCase()) ||
        d.ticket?.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
        d.client?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        d.asset?.brand?.toLowerCase().includes(search.toLowerCase())
      )
    : diagnoses;

  const totals = {
    draft:    diagnoses.filter((d: any) => d.status === 'DRAFT').length,
    sent:     diagnoses.filter((d: any) => d.status === 'SENT').length,
    approved: diagnoses.filter((d: any) => d.status === 'APPROVED').length,
    rejected: diagnoses.filter((d: any) => d.status === 'REJECTED').length,
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Diagnósticos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Diagnósticos técnicos de equipos</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Diagnóstico
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Borrador',     value: totals.draft,    icon: FileText,    color: 'text-gray-500',    bg: 'bg-gray-100'    },
          { label: 'Enviados',     value: totals.sent,     icon: Send,        color: 'text-blue-500',    bg: 'bg-blue-100'    },
          { label: 'Aprobados',    value: totals.approved, icon: CheckCircle2,color: 'text-emerald-500', bg: 'bg-emerald-100' },
          { label: 'No aprobados', value: totals.rejected, icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-100'     },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, ticket, cliente..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none"
        >
          <option value="ALL">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay diagnósticos</p>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-xs text-primary hover:underline"
              >
                + Crear primer diagnóstico
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Número', 'Ticket', 'Cliente', 'Equipo', 'Técnico', 'Fecha', 'Estado', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => {
                  const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-primary">{d.diagnosisNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {d.ticket?.ticketNumber ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{d.client?.companyName ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {[d.asset?.brand, d.asset?.model].filter(Boolean).join(' ') || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{d.technician?.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', cfg.bg, cfg.text)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Ver detalles */}
                          <button
                            onClick={() => setDetailDiag(d)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </button>

                          {/* Botón rápido: APPROVED → Crear Solución */}
                          {d.status === 'APPROVED' && !d.solutions?.length && canCreate && (
                            <button
                              onClick={() => setSolutionDiag(d)}
                              className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded-lg font-medium transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              Solución
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal crear diagnóstico ── */}
      {showCreateModal && (
        <DiagnosticoModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            qc.invalidateQueries({ queryKey: ['diagnoses'] });
            toast.success('Diagnóstico creado correctamente');
          }}
        />
      )}

      {/* ── Panel de detalle ── */}
      {detailDiag && (
        <DiagnosticoDetail
          diagnosis={detailDiag}
          userRole={role}
          onClose={() => setDetailDiag(null)}
          onCreateSolution={(diag) => setSolutionDiag(diag)}
        />
      )}

      {/* ── Modal solución (pre-rellena desde diagnóstico aprobado) ── */}
      {solutionDiag && (
        <SolucionModal
          prefillDiagnosisId={solutionDiag.id}
          onClose={() => setSolutionDiag(null)}
          onSuccess={() => {
            setSolutionDiag(null);
            qc.invalidateQueries({ queryKey: ['diagnoses'] });
            toast.success('Solución creada correctamente');
          }}
        />
      )}
    </div>
  );
}
