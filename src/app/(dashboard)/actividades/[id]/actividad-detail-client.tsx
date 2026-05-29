'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  User,
  Building2,
  Monitor,
  Loader2,
  Edit2,
  CheckCircle2,
  PlayCircle,
  FileText,
} from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import {
  cn,
  formatDateTime,
  formatMinutes,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/utils';

export function ActividadDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editStatus, setEditStatus] = useState(false);

  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/actividades/${id}`);
      return data.data;
    },
  });

  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['activity-attachments', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/actividades/${id}/attachments`);
      return data.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updateData: any = { status };
      if (status === 'IN_PROGRESS' && !activity?.startTime) {
        updateData.startTime = new Date().toISOString();
      }
      if (status === 'COMPLETED' && !activity?.endTime) {
        updateData.endTime = new Date().toISOString();
      }
      await axios.patch(`/api/actividades/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', id] });
      toast.success('Estado actualizado');
      setEditStatus(false);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activity) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-blue-600 font-bold">{activity.activityNumber}</span>
              <span className={cn('badge', ACTIVITY_STATUS_COLORS[activity.status])}>
                {ACTIVITY_STATUS_LABELS[activity.status]}
              </span>
              <span className={cn('badge', PRIORITY_COLORS[activity.priority])}>
                {PRIORITY_LABELS[activity.priority]}
              </span>
            </div>
            <h1 className="text-xl font-bold">{activity.description}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activity.status === 'PENDING' && (
            <button
              onClick={() => statusMutation.mutate('IN_PROGRESS')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {activity.status === 'IN_PROGRESS' && (
            <button
              onClick={() => statusMutation.mutate('COMPLETED')}
              disabled={statusMutation.isPending}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-500 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Completar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
            <h3 className="section-title mb-4">Descripción</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{activity.description}</p>
          </div>

          {activity.diagnosis && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
              <h3 className="section-title mb-3">Diagnóstico técnico</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{activity.diagnosis}</p>
            </div>
          )}

          {activity.solution && (
            <div className="bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 p-6">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-3">Solución aplicada</h3>
              <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap leading-relaxed">{activity.solution}</p>
            </div>
          )}

          {/* Adjuntos */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Archivos adjuntos
              {attachments.length > 0 && (
                <span className="ml-1 text-sm text-muted-foreground font-normal">({attachments.length})</span>
              )}
            </h3>
            <FileUpload
              entityType="actividades"
              entityId={id}
              attachments={attachments}
              onAttachmentsChange={() => refetchAttachments()}
              folder="actividades"
            />
          </div>

          {activity.diagnosis_ai?.[0] && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20 p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-400">Diagnóstico IA</span>
                <span className="badge bg-blue-100 text-blue-700 border-blue-200 text-xs">GPT-4</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">{activity.diagnosis_ai[0].diagnosis}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Tiempos
            </h3>
            <div className="space-y-3">
              {activity.startTime && (
                <div>
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="text-sm font-medium mt-0.5">{formatDateTime(activity.startTime)}</p>
                </div>
              )}
              {activity.endTime && (
                <div>
                  <p className="text-xs text-muted-foreground">Fin</p>
                  <p className="text-sm font-medium mt-0.5">{formatDateTime(activity.endTime)}</p>
                </div>
              )}
              {activity.totalMinutes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Tiempo total</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{formatMinutes(activity.totalMinutes)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Personal
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Técnico</p>
                <p className="text-sm font-medium mt-0.5">{activity.technician?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creado por</p>
                <p className="text-sm font-medium mt-0.5">{activity.createdBy?.name}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Cliente y activo
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="text-sm font-medium mt-0.5">{activity.client?.companyName}</p>
              </div>
              {activity.asset && (
                <div>
                  <p className="text-xs text-muted-foreground">Equipo</p>
                  <p className="text-sm font-medium mt-0.5">{activity.asset.brand} {activity.asset.model}</p>
                  {activity.asset.serial && (
                    <p className="text-xs text-muted-foreground font-mono">{activity.asset.serial}</p>
                  )}
                </div>
              )}
              {activity.ticket && (
                <div>
                  <p className="text-xs text-muted-foreground">Ticket relacionado</p>
                  <p className="text-sm font-medium font-mono text-blue-600 mt-0.5">{activity.ticket.ticketNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
