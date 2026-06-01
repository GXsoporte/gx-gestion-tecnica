'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  X, CheckCircle2, XCircle, Send,
  Ticket, Monitor, User, Wrench,
  Clock, FileText, AlertTriangle,
  Loader2, Mail, Download, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Status config ──────────────────────────────────────── */
const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: React.ElementType;
}> = {
  IN_PROGRESS: { label: 'En proceso',  color: 'text-blue-700',    bg: 'bg-blue-100',    icon: Clock       },
  COMPLETED:   { label: 'Completada',  color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelada',   color: 'text-red-700',     bg: 'bg-red-100',     icon: XCircle     },
};

const DELIVERY_CONFIG: Record<string, {
  label: string; color: string; bg: string;
}> = {
  PENDING:   { label: 'Pendiente entrega', color: 'text-amber-700',   bg: 'bg-amber-100'   },
  DELIVERED: { label: 'Entregado',         color: 'text-emerald-700', bg: 'bg-emerald-100' },
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

/* ─── Componente principal ───────────────────────────────── */
interface SolucionDetailProps {
  solution: any;
  userRole: string;
  onClose: () => void;
}

export function SolucionDetail({
  solution: initialSol,
  userRole,
  onClose,
}: SolucionDetailProps) {
  const qc = useQueryClient();
  const [sol, setSol] = useState(initialSol);
  const [loading, setLoading] = useState<string | null>(null);

  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(userRole);

  const cfg        = STATUS_CONFIG[sol.status]            ?? STATUS_CONFIG.IN_PROGRESS;
  const delCfg     = DELIVERY_CONFIG[sol.deliveryStatus]  ?? DELIVERY_CONFIG.PENDING;
  const StatusIcon = cfg.icon;

  const changeStatus = async (field: 'status' | 'deliveryStatus', value: string) => {
    setLoading(value);
    try {
      const { data } = await axios.patch(`/api/soluciones/${sol.id}`, { [field]: value });
      setSol((prev: any) => ({ ...prev, [field]: value, ...data.data }));
      qc.invalidateQueries({ queryKey: ['solutions'] });
      toast.success(
        value === 'COMPLETED'  ? '✅ Solución completada' :
        value === 'DELIVERED'  ? '✅ Solución marcada como entregada' :
        value === 'CANCELLED'  ? 'Solución cancelada' :
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
      const { data } = await axios.post(`/api/soluciones/${sol.id}/send-email`);
      qc.invalidateQueries({ queryKey: ['solutions'] });
      toast.success(`✉️ Solución enviada a ${data.data?.email}`);
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
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold font-mono">{sol.solutionNumber}</span>
                <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', delCfg.bg, delCfg.color)}>
                  {delCfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(sol.createdAt).toLocaleDateString('es-CO', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/api/soluciones/${sol.id}/reporte`, '_blank')}
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
              { icon: Ticket,  label: 'Ticket',  value: sol.ticket?.ticketNumber },
              { icon: User,    label: 'Cliente', value: sol.client?.companyName  },
              { icon: Monitor, label: 'Equipo',  value: `${sol.asset?.brand ?? ''} ${sol.asset?.model ?? ''}`.trim() || undefined },
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

          {/* Contenido de la solución */}
          <div className="rounded-xl border border-border p-4 space-y-0">
            <InfoRow icon={Wrench}        label="Actividades realizadas"     value={sol.activitiesDone}     />
            <InfoRow icon={FileText}      label="Repuestos utilizados"       value={sol.spareParts}         />
            <InfoRow icon={FileText}      label="Software instalado"         value={sol.installedSoftware}  />
            <InfoRow icon={FileText}      label="Configuraciones aplicadas"  value={sol.configurations}     />
            <InfoRow icon={CheckCircle2}  label="Pruebas realizadas"         value={sol.testsDone}          />
            <InfoRow icon={CheckCircle2}  label="Resultado final"            value={sol.finalResult}        />
            <InfoRow icon={AlertTriangle} label="Recomendaciones al cliente" value={sol.recommendations}    />
          </div>

          {/* Estimados de fechas */}
          {(sol.startDate || sol.endDate) && (
            <div className="grid grid-cols-2 gap-3">
              {sol.startDate && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-semibold text-blue-700 uppercase">Fecha inicio</span>
                  </div>
                  <p className="text-sm font-bold text-blue-800">
                    {new Date(sol.startDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
              {sol.endDate && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] font-semibold text-green-700 uppercase">Fecha fin</span>
                  </div>
                  <p className="text-sm font-bold text-green-800">
                    {new Date(sol.endDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Técnico responsable */}
          {sol.technician?.name && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Técnico: <strong className="text-foreground">{sol.technician.name}</strong>
            </p>
          )}

          {/* Diagnóstico vinculado */}
          {sol.diagnosis?.diagnosisNumber && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Diagnóstico vinculado</p>
              <p className="text-sm font-mono text-blue-800">{sol.diagnosis.diagnosisNumber}</p>
            </div>
          )}
        </div>

        {/* ── Acciones (footer) ── */}
        <div className="border-t border-border p-4 flex-shrink-0 space-y-3">

          {/* IN_PROGRESS → Completar */}
          {sol.status === 'IN_PROGRESS' && canManage && (
            <div className="flex gap-3">
              <button
                onClick={() => window.open(`/api/soluciones/${sol.id}/reporte`, '_blank')}
                className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={() => changeStatus('status', 'COMPLETED')}
                disabled={!!loading}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'COMPLETED'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                Completar
              </button>
            </div>
          )}

          {/* COMPLETED + PENDING → Marcar como entregado */}
          {sol.status === 'COMPLETED' && sol.deliveryStatus === 'PENDING' && canManage && (
            <div className="flex gap-3">
              <button
                onClick={() => window.open(`/api/soluciones/${sol.id}/reporte`, '_blank')}
                className="flex items-center justify-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={() => changeStatus('deliveryStatus', 'DELIVERED')}
                disabled={!!loading}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading === 'DELIVERED'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Truck className="w-4 h-4" />}
                Marcar como entregado
              </button>
            </div>
          )}

          {/* Siempre: Enviar al cliente */}
          <button
            onClick={sendEmail}
            disabled={!!loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading === 'email'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Mail className="w-4 h-4" />}
            Enviar al cliente
          </button>

          {/* Cerrar */}
          <button onClick={onClose}
            className="w-full border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
