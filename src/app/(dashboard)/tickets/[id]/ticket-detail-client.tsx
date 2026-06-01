'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Clock,
  User,
  Building2,
  Monitor,
  MessageSquare,
  FileText,
  Send,
  Edit2,
  Loader2,
  Stethoscope,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import Link from 'next/link';
import {
  cn,
  formatDateTime,
  formatDate,
  timeAgo,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
} from '@/lib/utils';

const DIAG_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: 'Borrador',    color: 'text-gray-600',    bg: 'bg-gray-100'    },
  SENT:     { label: 'Enviado al cliente', color: 'text-blue-700', bg: 'bg-blue-100' },
  APPROVED: { label: 'Aprobado',    color: 'text-emerald-700', bg: 'bg-emerald-100' },
  REJECTED: { label: 'No aprobado', color: 'text-red-700',     bg: 'bg-red-100'     },
  COMPLETED:{ label: 'Completado',  color: 'text-purple-700',  bg: 'bg-purple-100'  },
  INFO_REQUESTED: { label: 'Más info solicitada', color: 'text-amber-700', bg: 'bg-amber-100' },
};

const SOL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  IN_PROGRESS: { label: 'En proceso',  color: 'text-blue-700',    bg: 'bg-blue-100'    },
  COMPLETED:   { label: 'Completada',  color: 'text-emerald-700', bg: 'bg-emerald-100' },
  CANCELLED:   { label: 'Cancelada',   color: 'text-red-700',     bg: 'bg-red-100'     },
};

export function TicketDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/tickets/${id}`);
      return data.data;
    },
  });

  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['ticket-attachments', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/tickets/${id}/attachments`);
      return data.data;
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/tickets/${id}/comments`, { content: comment, isInternal });
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Comentario añadido');
    },
    onError: () => toast.error('Error al enviar comentario'),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data } = await axios.patch(`/api/tickets/${id}`, { status });
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setEditStatus(false);
      if (data?.autoActivity) {
        toast.success(
          `Actividad ${data.autoActivity.activityNumber} creada automáticamente`,
          {
            description: `Técnico: ${data.autoActivity.technician?.name ?? 'Sin asignar'} · Cliente: ${data.autoActivity.client?.companyName}`,
            action: {
              label: 'Ver actividad',
              onClick: () => router.push(`/actividades/${data.autoActivity.id}`),
            },
            duration: 6000,
          }
        );
      } else {
        toast.success('Estado actualizado');
      }
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) return null;

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'ESCALATED', 'RESOLVED', 'CLOSED'];
  const canEdit = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN'].includes(session?.user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-blue-600 font-bold">{ticket.ticketNumber}</span>
              <span className={cn('badge', TICKET_STATUS_COLORS[ticket.status])}>
                {TICKET_STATUS_LABELS[ticket.status]}
              </span>
              <span className={cn('badge', PRIORITY_COLORS[ticket.priority])}>
                {PRIORITY_LABELS[ticket.priority]}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Creado {timeAgo(ticket.createdAt)} · {TICKET_TYPE_LABELS[ticket.type]}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {editStatus ? (
              <div className="flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
                >
                  <option value="">Cambiar estado...</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  onClick={() => newStatus && statusMutation.mutate(newStatus)}
                  disabled={!newStatus || statusMutation.isPending}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </button>
                <button
                  onClick={() => setEditStatus(false)}
                  className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditStatus(true)}
                className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Cambiar estado
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
            <h3 className="section-title mb-4">Descripción del problema</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Actividades relacionadas */}
          {ticket.activities?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
              <h3 className="section-title mb-4">Actividades relacionadas</h3>
              <div className="space-y-3">
                {ticket.activities.map((act: any) => (
                  <div key={act.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{act.activityNumber}</p>
                      <p className="text-xs text-muted-foreground">{act.technician?.name} · {formatDate(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
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
              entityType="tickets"
              entityId={id}
              attachments={attachments}
              onAttachmentsChange={() => refetchAttachments()}
              folder="tickets"
            />
          </div>

          {/* Comentarios */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="section-title">
                Conversación
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  ({ticket.comments?.length || 0} comentarios)
                </span>
              </h3>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto scrollbar-thin">
              {ticket.comments?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay comentarios aún
                </div>
              ) : (
                ticket.comments?.map((c: any) => (
                  <div
                    key={c.id}
                    className={cn(
                      'px-6 py-4',
                      c.isInternal && 'bg-yellow-50/50 dark:bg-yellow-500/5'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {c.user?.name?.[0] || 'U'}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{c.user?.name}</span>
                      {c.isInternal && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5 font-medium">
                          Interno
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground pl-9 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input comentario */}
            <div className="px-6 py-4 border-t border-border">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Escribe un comentario o actualización..."
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                {canEdit && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    Nota interna (solo visible para el equipo)
                  </label>
                )}
                <button
                  onClick={() => comment.trim() && commentMutation.mutate()}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Info cliente */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Información del cliente
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium mt-0.5">{ticket.client?.companyName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solicitante</p>
                <p className="text-sm font-medium mt-0.5">{ticket.requesterName}</p>
                {ticket.requesterPosition && (
                  <p className="text-xs text-muted-foreground">{ticket.requesterPosition}</p>
                )}
              </div>
              {ticket.requesterEmail && (
                <div>
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <a href={`mailto:${ticket.requesterEmail}`} className="text-sm text-primary hover:underline mt-0.5 block">
                    {ticket.requesterEmail}
                  </a>
                </div>
              )}
              {ticket.requesterPhone && (
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm mt-0.5">{ticket.requesterPhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Asignación */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Asignación
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Técnico asignado</p>
                <p className="text-sm font-medium mt-0.5">
                  {ticket.assignedTo?.name || 'Sin asignar'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creado por</p>
                <p className="text-sm font-medium mt-0.5">{ticket.createdBy?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de creación</p>
                <p className="text-sm mt-0.5">{formatDateTime(ticket.createdAt)}</p>
              </div>
              {ticket.dueDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Fecha límite</p>
                  <p className="text-sm mt-0.5">{formatDate(ticket.dueDate)}</p>
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Cerrado</p>
                  <p className="text-sm mt-0.5">{formatDateTime(ticket.closedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipo relacionado */}
          {ticket.relatedAsset && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                Equipo relacionado
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Equipo</p>
                  <p className="text-sm font-medium mt-0.5">
                    {ticket.relatedAsset.brand} {ticket.relatedAsset.model}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Serial</p>
                  <p className="text-sm font-mono mt-0.5">{ticket.relatedAsset.serial || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Diagnóstico y Solución vinculados */}
          {ticket.diagnoses?.length > 0 && (() => {
            const diag = ticket.diagnoses[0];
            const sol  = diag.solutions?.[0];
            const diagCfg = DIAG_STATUS[diag.status] ?? DIAG_STATUS.DRAFT;
            const solCfg  = sol ? SOL_STATUS[sol.status] ?? SOL_STATUS.IN_PROGRESS : null;

            return (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Diagnóstico técnico
                </h3>

                {/* Diagnóstico */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Stethoscope className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-mono font-semibold text-primary">{diag.diagnosisNumber}</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', diagCfg.bg, diagCfg.color)}>
                      {diagCfg.label}
                    </span>
                  </div>
                  <Link
                    href="/diagnosticos"
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium flex-shrink-0"
                  >
                    Ver diagnóstico <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Solución (si existe) */}
                {sol && solCfg ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-mono font-semibold text-primary">{sol.solutionNumber}</span>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', solCfg.bg, solCfg.color)}>
                        {solCfg.label}
                      </span>
                    </div>
                    <Link
                      href="/soluciones"
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium flex-shrink-0"
                    >
                      Ver solución <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : diag.status === 'APPROVED' ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    Diagnóstico aprobado — pendiente de crear solución
                  </p>
                ) : null}
              </div>
            );
          })()}

          {/* Resolución */}
          {ticket.resolution && (
            <div className="bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 p-5">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2">
                Resolución
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                {ticket.resolution}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
