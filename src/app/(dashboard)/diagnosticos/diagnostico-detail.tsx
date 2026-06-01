'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  X, CheckCircle2, XCircle, Send, ArrowRight,
  Ticket, Monitor, User, Stethoscope, Wrench,
  Clock, DollarSign, FileText, AlertTriangle,
  Loader2, Mail, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Status config ──────────────────────────────────────── */
const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: React.ElementType;
}> = {
  DRAFT:          { label: 'Borrador',       color: 'text-gray-600',    bg: 'bg-gray-100',    icon: FileText      },
  SENT:           { label: 'Enviado',        color: 'text-blue-700',    bg: 'bg-blue-100',    icon: Send          },
  APPROVED:       { label: 'Aprobado',       color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2  },
  REJECTED:       { label: 'No aprobado',    color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle       },
  INFO_REQUESTED: { label: 'Más info',       color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertTriangle },
  COMPLETED:      { label: 'Completado',     color: 'text-purple-700',  bg: 'bg-purple-100',  icon: CheckCircle2  },
};

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
}

/* ─── Función de descarga — abre la ruta de reporte ────── */
function printDiagnosis(diag: any) {
  window.open(`/api/diagnosticos/${diag.id}/reporte`, '_blank');
}

/* ─── Componente principal ───────────────────────────────── */
interface DiagnosticoDetailProps {
  diagnosis: any;
  userRole: string;
  onClose: () => void;
  onCreateSolution: (diag: any) => void;
}

export function DiagnosticoDetail({
  diagnosis: initialDiag,
  userRole,
  onClose,
  onCreateSolution,
}: DiagnosticoDetailProps) {
  const qc = useQueryClient();
  const [diag, setDiag] = useState(initialDiag);
  const [loading, setLoading] = useState<string | null>(null);

  const canManage      = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(userRole);
  const canApprove     = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'CLIENT'].includes(userRole);
  const canSolution    = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(userRole);

  const cfg        = STATUS_CONFIG[diag.status] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;

  const changeStatus = async (status: string) => {
    setLoading(status);
    try {
      const { data } = await axios.patch(`/api/diagnosticos/${diag.id}`, { status });
      setDiag((prev: any) => ({ ...prev, status, ...data.data }));
      qc.invalidateQueries({ queryKey: ['diagnoses'] });
      toast.success(
        status === 'APPROVED'  ? '✅ Diagnóstico aprobado' :
        status === 'REJECTED'  ? 'Diagnóstico marcado como no aprobado' :
        status === 'COMPLETED' ? '✅ Diagnóstico completado — ticket archivado' :
        'Estado actualizado'
      );
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al actualizar');
    } finally {
      setLoading(null);
    }
  };

  const sendEmail = async () => {
    setLoading('email');
    try {
      const { data } = await axios.post(`/api/diagnosticos/${diag.id}/send-email`);
      setDiag((prev: any) => ({ ...prev, status: 'SENT' }));
      qc.invalidateQueries({ queryKey: ['diagnoses'] });
      toast.success(`✉️ Diagnóstico enviado a ${data.data?.email}`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al enviar correo');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold font-mono">{diag.diagnosisNumber}</span>
                <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(diag.createdAt).toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Descargar / Imprimir */}
            <button
              onClick={() => printDiagnosis(diag)}
              className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-xl hover:bg-muted transition-colors font-medium"
              title="Descargar / Imprimir"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Resumen en tarjetas */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Ticket,  label: 'Ticket',  value: diag.ticket?.ticketNumber },
              { icon: User,    label: 'Cliente', value: diag.client?.companyName  },
              { icon: Monitor, label: 'Equipo',  value: `${diag.asset?.brand ?? ''} ${diag.asset?.model ?? ''}`.trim() || undefined },
            ].map(({ icon: Icon, label, value }) => value ? (
              <div key={label} className="bg-muted/30 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
                </div>
                <p className="text-sm font-semibold truncate">{value}</p>
              </div>
            ) : null)}
          </div>

          {/* Contenido del diagnóstico */}
          <div className="rounded-xl border border-border p-4 space-y-0">
            <InfoRow icon={FileText}      label="Descripción del problema" value={diag.description}     />
            <InfoRow icon={AlertTriangle} label="Causa identificada"       value={diag.problemCause}    />
            <InfoRow icon={CheckCircle2}  label="Recomendación"            value={diag.recommendation}  />
            <InfoRow icon={FileText}      label="Notas del técnico"        value={diag.technicianNotes} />
          </div>

          {/* Estimados */}
          {(diag.estimatedCost || diag.estimatedTime) && (
            <div className="grid grid-cols-2 gap-3">
              {diag.estimatedCost && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] font-semibold text-green-700 uppercase">Costo estimado</span>
                  </div>
                  <p className="text-lg font-bold text-green-800">
                    ${Number(diag.estimatedCost).toLocaleString('es-CO')}
                  </p>
                </div>
              )}
              {diag.estimatedTime && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-semibold text-blue-700 uppercase">Tiempo estimado</span>
                  </div>
                  <p className="text-sm font-bold text-blue-800">{diag.estimatedTime}</p>
                </div>
              )}
            </div>
          )}

          {/* Requiere reparación */}
          <div className={cn(
            'flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium',
            diag.requiresRepair
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : 'bg-gray-50 border-gray-200 text-gray-600'
          )}>
            <Wrench className="w-4 h-4 flex-shrink-0" />
            {diag.requiresRepair ? 'Requiere reparación' : 'No requiere reparación'}
          </div>

          {/* Técnico */}
          {diag.technician?.name && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Técnico: <strong className="text-foreground">{diag.technician.name}</strong>
            </p>
          )}

          {/* Soluciones vinculadas */}
          {diag.solutions?.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1.5">✅ Solución creada</p>
              {diag.solutions.map((s: any) => (
                <p key={s.id} className="text-sm font-mono text-purple-800">{s.solutionNumber}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── Acciones (footer) ── */}
        <div className="border-t border-border p-4 flex-shrink-0 space-y-3">

          {/* DRAFT → Descargar + Enviar al cliente → pasa a ENVIADO */}
          {diag.status === 'DRAFT' && canManage && (
            <div className="flex gap-3">
              <button
                onClick={() => printDiagnosis(diag)}
                className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={sendEmail}
                disabled={!!loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'email'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Mail className="w-4 h-4" />}
                Enviar al cliente
              </button>
            </div>
          )}

          {/* SENT → Descargar + Aprobar / No aprobar (admin, coordinador, CLIENTE) */}
          {diag.status === 'SENT' && canApprove && (
            <div className="space-y-2">
              <button
                onClick={() => printDiagnosis(diag)}
                className="w-full flex items-center justify-center gap-2 border border-border py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar diagnóstico
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => changeStatus('REJECTED')}
                  disabled={!!loading}
                  className="flex-1 border border-red-300 text-red-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading === 'REJECTED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  No aprobar
                </button>
                <button
                  onClick={() => changeStatus('APPROVED')}
                  disabled={!!loading}
                  className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading === 'APPROVED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar
                </button>
              </div>
            </div>
          )}

          {/* APPROVED → Crear solución */}
          {diag.status === 'APPROVED' && canSolution && !diag.solutions?.length && (
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                Cerrar
              </button>
              <button
                onClick={() => { onClose(); onCreateSolution(diag); }}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Crear Solución
              </button>
            </div>
          )}

          {/* COMPLETED / REJECTED / APPROVED con solución → solo cerrar */}
          {(diag.status === 'COMPLETED' ||
            diag.status === 'REJECTED' ||
            (diag.status === 'APPROVED' && diag.solutions?.length > 0)) && (
            <button onClick={onClose}
              className="w-full border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
