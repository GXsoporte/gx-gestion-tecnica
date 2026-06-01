'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Stethoscope, CheckCircle2, XCircle, Clock, Send,
  FileText, Download, Loader2, X, AlertTriangle,
  Wrench, DollarSign, Monitor, Ticket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string; icon: React.ElementType }> = {
  DRAFT:    { label: 'Borrador',    text: 'text-gray-600',    bg: 'bg-gray-100',    icon: FileText      },
  SENT:     { label: 'Pendiente de aprobación', text: 'text-blue-700', bg: 'bg-blue-100', icon: Send },
  APPROVED: { label: 'Aprobado',    text: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2  },
  REJECTED: { label: 'No aprobado', text: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle       },
  COMPLETED:{ label: 'Completado',  text: 'text-purple-700',  bg: 'bg-purple-100',  icon: CheckCircle2  },
  INFO_REQUESTED: { label: 'Más info solicitada', text: 'text-amber-700', bg: 'bg-amber-100', icon: AlertTriangle },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function printDiagnosis(diag: any) {
  window.open(`/api/diagnosticos/${diag.id}/reporte`, '_blank');
}

function DiagnosisCard({ diag, onAction }: { diag: any; onAction: (id: string, status: string) => void }) {
  const cfg = STATUS_CONFIG[diag.status] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (status: string) => {
    setLoading(status);
    try {
      await onAction(diag.id, status);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono font-bold text-primary text-sm">{diag.diagnosisNumber}</span>
              <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {diag.ticket?.ticketNumber && (
                <span className="flex items-center gap-1">
                  <Ticket className="w-3 h-3" />
                  {diag.ticket.ticketNumber}
                </span>
              )}
              {(diag.asset?.brand || diag.asset?.model) && (
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {[diag.asset.brand, diag.asset.model].filter(Boolean).join(' ')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {fmtDate(diag.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline font-medium flex-shrink-0"
          >
            {expanded ? 'Ocultar' : 'Ver detalles'}
          </button>
        </div>

        {/* Summary */}
        {diag.description && (
          <p className="text-sm text-foreground mt-3 line-clamp-2 leading-relaxed">{diag.description}</p>
        )}

        {/* Cost / time summary */}
        {(diag.estimatedCost || diag.estimatedTime) && (
          <div className="flex gap-3 mt-3 flex-wrap">
            {diag.estimatedCost && (
              <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">
                <DollarSign className="w-3 h-3" />
                ${Number(diag.estimatedCost).toLocaleString('es-CO')}
              </div>
            )}
            {diag.estimatedTime && (
              <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">
                <Clock className="w-3 h-3" />
                {diag.estimatedTime}
              </div>
            )}
            {diag.requiresRepair && (
              <div className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg font-medium">
                <Wrench className="w-3 h-3" />
                Requiere reparación
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-3 bg-muted/20">
          {diag.problemCause && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Causa identificada</p>
              <p className="text-sm text-foreground leading-relaxed">{diag.problemCause}</p>
            </div>
          )}
          {diag.recommendation && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recomendación</p>
              <p className="text-sm text-foreground leading-relaxed">{diag.recommendation}</p>
            </div>
          )}
          {diag.technician?.name && (
            <p className="text-xs text-muted-foreground">Técnico: <strong className="text-foreground">{diag.technician.name}</strong></p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-border p-4 bg-muted/10">
        {diag.status === 'SENT' ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Revisa el diagnóstico y decide si apruebas la reparación
            </p>
            <button
              onClick={() => printDiagnosis(diag)}
              className="w-full flex items-center justify-center gap-2 border border-border py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar diagnóstico
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('REJECTED')}
                disabled={!!loading}
                className="flex-1 border border-red-300 text-red-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'REJECTED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                No aprobar
              </button>
              <button
                onClick={() => handleAction('APPROVED')}
                disabled={!!loading}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'APPROVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Aprobar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => printDiagnosis(diag)}
            className="w-full flex items-center justify-center gap-2 border border-border py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar diagnóstico
          </button>
        )}
      </div>
    </div>
  );
}

export function PortalDiagnosticosClient() {
  const qc = useQueryClient();

  const { data: diagnoses = [], isLoading } = useQuery({
    queryKey: ['portal-diagnoses'],
    queryFn: async () => {
      const { data } = await axios.get('/api/diagnosticos');
      return data.data || [];
    },
  });

  const handleAction = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/diagnosticos/${id}`, { status });
      qc.invalidateQueries({ queryKey: ['portal-diagnoses'] });
      toast.success(
        status === 'APPROVED'
          ? '✅ Diagnóstico aprobado — el equipo técnico comenzará la reparación'
          : 'Diagnóstico marcado como no aprobado'
      );
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al actualizar');
    }
  };

  const pending  = diagnoses.filter((d: any) => d.status === 'SENT');
  const rest     = diagnoses.filter((d: any) => d.status !== 'SENT');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" />
          Mis diagnósticos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aquí puedes revisar, descargar y aprobar los diagnósticos técnicos de tus equipos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : diagnoses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-border">
          <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tienes diagnósticos registrados aún</p>
        </div>
      ) : (
        <>
          {/* Pendientes de aprobación primero */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h2 className="text-sm font-semibold text-foreground">Pendientes de tu aprobación ({pending.length})</h2>
              </div>
              {pending.map((d: any) => (
                <DiagnosisCard key={d.id} diag={d} onAction={handleAction} />
              ))}
            </div>
          )}

          {/* Resto */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {pending.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground">Historial</h2>
              )}
              {rest.map((d: any) => (
                <DiagnosisCard key={d.id} diag={d} onAction={handleAction} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
