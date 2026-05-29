'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft, Wrench, Calendar, Clock, User, Building2,
  Monitor, FileText, Loader2, Edit2, CheckCircle2,
  PlayCircle, FileBarChart2, ClipboardList,
} from 'lucide-react';
import {
  cn, formatDate, formatDateTime,
  MAINTENANCE_TYPE_LABELS, MAINTENANCE_STATUS_LABELS,
} from '@/lib/utils';
import { FileUpload } from '@/components/ui/file-upload';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED:   'bg-green-50 text-green-700 border-green-200',
  CANCELLED:   'bg-slate-100 text-slate-600 border-slate-200',
  OVERDUE:     'bg-red-50 text-red-700 border-red-200',
};

const TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  CORRECTIVE: 'bg-orange-50 text-orange-700 border-orange-200',
  PREDICTIVE: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function MantenimientoDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/mantenimientos/${id}`);
      return data.data;
    },
  });

  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['maintenance-attachments', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/mantenimientos/${id}/attachments`);
      return data.data;
    },
  });

  const { data: linkedActivity } = useQuery({
    queryKey: ['maintenance-activity', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/actividades?maintenanceId=${id}`);
      return data.data?.[0] ?? null;
    },
    enabled: !!maintenance,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data } = await axios.patch(`/api/mantenimientos/${id}`, { status });
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-activity', id] });
      setEditingStatus(false);
      if (data?.autoActivity) {
        toast.success(
          `Actividad ${data.autoActivity.activityNumber} creada automáticamente`,
          {
            description: `Técnico: ${data.autoActivity.technician?.name} · Cliente: ${data.autoActivity.client?.companyName}`,
            action: {
              label: 'Ver actividad',
              onClick: () => router.push(`/actividades/${data.autoActivity.id}`),
            },
            duration: 7000,
          }
        );
      } else {
        toast.success('Estado actualizado');
      }
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const notesMutation = useMutation({
    mutationFn: async () => {
      await axios.patch(`/api/mantenimientos/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setEditingNotes(false);
      toast.success('Notas guardadas');
    },
    onError: () => toast.error('Error al guardar notas'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!maintenance) return null;

  const isOverdue = new Date(maintenance.scheduledDate) < new Date() && maintenance.status === 'SCHEDULED';
  const canProgress = maintenance.status === 'SCHEDULED' || maintenance.status === 'OVERDUE';
  const canComplete = maintenance.status === 'IN_PROGRESS';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn('badge', STATUS_COLORS[maintenance.status])}>
                {MAINTENANCE_STATUS_LABELS[maintenance.status]}
              </span>
              <span className={cn('badge', TYPE_COLORS[maintenance.type])}>
                {MAINTENANCE_TYPE_LABELS[maintenance.type]}
              </span>
              {isOverdue && (
                <span className="badge bg-red-100 text-red-700 border-red-200">Vencido</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{maintenance.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Programado para {formatDate(maintenance.scheduledDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick action buttons */}
          {canProgress && (
            <button
              onClick={() => statusMutation.mutate('IN_PROGRESS')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => statusMutation.mutate('COMPLETED')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-500 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Completar
            </button>
          )}

          {/* Change status dropdown */}
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">Seleccionar estado...</option>
                {Object.entries(MAINTENANCE_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={() => newStatus && statusMutation.mutate(newStatus)}
                disabled={!newStatus || statusMutation.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Aplicar
              </button>
              <button onClick={() => setEditingStatus(false)} className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted">
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingStatus(true)}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Cambiar estado
            </button>
          )}

          {/* Report button */}
          <a
            href={`/api/mantenimientos/${id}/reporte`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <FileBarChart2 className="w-3.5 h-3.5" />
            Ver reporte
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          {maintenance.description && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
              <h3 className="section-title mb-3">Descripción</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {maintenance.description}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">Notas técnicas</h3>
              {!editingNotes && (
                <button
                  onClick={() => { setNotes(maintenance.notes ?? ''); setEditingNotes(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Agregar notas técnicas del mantenimiento..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => notesMutation.mutate()}
                    disabled={notesMutation.isPending}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {notesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                  </button>
                  <button onClick={() => setEditingNotes(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : maintenance.notes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{maintenance.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin notas técnicas</p>
            )}
          </div>

          {/* Linked Activity */}
          {linkedActivity && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
              <h3 className="section-title mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                Actividad vinculada
              </h3>
              <div
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                onClick={() => router.push(`/actividades/${linkedActivity.id}`)}
              >
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono">
                    {linkedActivity.activityNumber}
                  </p>
                  <p className="text-xs text-blue-600/70">{linkedActivity.description}</p>
                </div>
                <span className="text-xs text-blue-600 font-medium">Ver →</span>
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Archivos adjuntos
              {attachments.length > 0 && (
                <span className="ml-1 text-sm text-muted-foreground font-normal">({attachments.length})</span>
              )}
            </h3>
            <FileUpload
              entityType="mantenimientos"
              entityId={id}
              attachments={attachments}
              onAttachmentsChange={() => refetchAttachments()}
              folder="mantenimientos"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Fechas
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Fecha programada</p>
                <p className={cn('text-sm font-medium mt-0.5', isOverdue && 'text-red-600')}>
                  {formatDate(maintenance.scheduledDate)}
                </p>
              </div>
              {maintenance.completedDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Fecha completado</p>
                  <p className="text-sm font-medium mt-0.5 text-green-600">{formatDateTime(maintenance.completedDate)}</p>
                </div>
              )}
              {maintenance.nextDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Próximo mantenimiento</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(maintenance.nextDate)}</p>
                </div>
              )}
              {maintenance.duration && (
                <div>
                  <p className="text-xs text-muted-foreground">Duración estimada</p>
                  <p className="text-sm font-medium mt-0.5">{maintenance.duration} min</p>
                </div>
              )}
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Registrado</p>
                <p className="text-sm mt-0.5">{formatDateTime(maintenance.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Technician */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Técnico asignado
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {maintenance.technician?.name?.[0] ?? 'T'}
                </span>
              </div>
              <p className="text-sm font-medium">{maintenance.technician?.name}</p>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Cliente
            </h3>
            <p className="text-sm font-medium">{maintenance.client?.companyName}</p>
          </div>

          {/* Asset */}
          {maintenance.asset && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <h3 className="section-title mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                Equipo
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Marca / Modelo</p>
                  <p className="text-sm font-medium mt-0.5">
                    {maintenance.asset.brand} {maintenance.asset.model}
                  </p>
                </div>
                {maintenance.asset.serial && (
                  <div>
                    <p className="text-xs text-muted-foreground">Serial</p>
                    <p className="text-sm font-mono mt-0.5">{maintenance.asset.serial}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
