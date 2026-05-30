'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Paperclip, FileText, Image } from 'lucide-react';
import { TICKET_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/utils';

const schema = z.object({
  subject: z.string().min(1, 'Requerido'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  type: z.string().min(1, 'Requerido'),
  priority: z.string().default('MEDIUM'),
  requesterName: z.string().min(1, 'Requerido'),
  requesterEmail: z.string().email().optional().or(z.literal('')),
  requesterPhone: z.string().optional(),
  requesterPosition: z.string().optional(),
  clientId:       z.string().min(1, 'Requerido'),
  assignedToId:   z.string().optional(),
  relatedAssetId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TicketModalProps {
  ticket?: any;
  onClose: () => void;
  onSuccess: () => void;
}

async function uploadAndLink(files: File[], entityId: string, folder: string, entityType: string) {
  for (const file of files) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const { data: up } = await axios.post('/api/upload', fd);
      await axios.post(`/api/${entityType}/${entityId}/attachments`, up.data);
    } catch {
      toast.error(`No se pudo adjuntar ${file.name}`);
    }
  }
}

export function TicketModal({ ticket, onClose, onSuccess }: TicketModalProps) {
  const isEdit = !!ticket;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(ticket?.clientId ?? '');
  const [selectedClientUserId, setSelectedClientUserId] = useState<string>('');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await axios.get('/api/clientes');
      return data.data;
    },
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['users-select', 'TECHNICIAN'],
    queryFn: async () => {
      const { data } = await axios.get('/api/usuarios?role=TECHNICIAN&active=true');
      return data.data;
    },
  });

  // Usuarios del cliente seleccionado
  const { data: clientUsers = [] } = useQuery({
    queryKey: ['client-users-for-ticket', selectedClientId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/clientes/${selectedClientId}/usuarios`);
      return data.data ?? [];
    },
    enabled: !!selectedClientId,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: ticket || { priority: 'MEDIUM' },
  });

  // Sincronizar clientId cuando carga la lista de clientes (edición)
  useEffect(() => {
    if (isEdit && clients.length > 0 && ticket?.clientId) {
      setValue('clientId', ticket.clientId, { shouldValidate: false });
    }
  }, [clients.length]);

  // Cuando se selecciona un ClientUser: auto-rellenar datos del solicitante
  const handleClientUserChange = (userId: string) => {
    setSelectedClientUserId(userId);
    if (!userId) {
      setValue('requesterName', '');
      setValue('requesterEmail', '');
      setValue('requesterPhone', '');
      setValue('requesterPosition', '');
      setValue('relatedAssetId', '');
      return;
    }
    const u = clientUsers.find((u: any) => u.id === userId);
    if (u) {
      setValue('requesterName',     u.name     ?? '', { shouldValidate: true });
      setValue('requesterEmail',    u.email1   ?? '');
      setValue('requesterPhone',    u.phone    ?? '');
      setValue('requesterPosition', u.cargo    ?? '');
      // Si tiene 1 solo equipo, auto-seleccionarlo
      if (u.assets?.length === 1) {
        setValue('relatedAssetId', u.assets[0].id);
      } else {
        setValue('relatedAssetId', '');
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await axios.patch(`/api/tickets/${ticket.id}`, data);
      } else {
        const { data: res } = await axios.post('/api/tickets', data);
        if (pendingFiles.length > 0) {
          await uploadAndLink(pendingFiles, res.data.id, 'tickets', 'tickets');
        }
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? 'Editar Ticket' : 'Nuevo Ticket de Soporte'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? `Editando ${ticket.ticketNumber}` : 'Complete la información del ticket'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Tipo de ticket *</label>
              <select
                {...register('type')}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Seleccionar tipo...</option>
                {Object.entries(TICKET_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {errors.type && <p className="text-destructive text-xs mt-1">{errors.type.message}</p>}
            </div>

            <div>
              <label className="form-label mb-1.5 block">Prioridad *</label>
              <select
                {...register('priority')}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label mb-1.5 block">Asunto *</label>
            <input
              {...register('subject')}
              placeholder="Descripción breve del problema..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {errors.subject && <p className="text-destructive text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="form-label mb-1.5 block">Descripción detallada *</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Describe el problema con el mayor detalle posible..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
            {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <select
                {...register('clientId')}
                onChange={(e) => {
                  setValue('clientId', e.target.value, { shouldValidate: true });
                  setSelectedClientId(e.target.value);
                  setSelectedClientUserId('');
                  setValue('requesterName', '');
                  setValue('requesterEmail', '');
                  setValue('relatedAssetId', '');
                }}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>

            <div>
              <label className="form-label mb-1.5 block">Técnico asignado</label>
              <select
                {...register('assignedToId')}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Sin asignar</option>
                {technicians.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Solicitante — usuario del cliente */}
          {selectedClientId && clientUsers.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                👤 Seleccionar solicitante del cliente
              </p>
              <select
                value={selectedClientUserId}
                onChange={(e) => handleClientUserChange(e.target.value)}
                className="w-full border border-blue-300 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              >
                <option value="">— Seleccionar persona —</option>
                {clientUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.cargo ? ` · ${u.cargo}` : ''}
                  </option>
                ))}
              </select>

              {/* Equipos del usuario seleccionado */}
              {selectedClientUserId && (() => {
                const u = clientUsers.find((u: any) => u.id === selectedClientUserId);
                if (!u?.assets?.length) return null;
                return (
                  <div>
                    <p className="text-[11px] font-medium text-blue-600 mb-2">Equipo(s) asignado(s) a {u.name}:</p>
                    <select
                      {...register('relatedAssetId')}
                      className="w-full border border-blue-300 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                    >
                      <option value="">— Seleccionar equipo del ticket —</option>
                      {u.assets.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          🖥 {a.brand} {a.model} · {a.assetNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground mb-3">Información del solicitante</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">Nombre *</label>
                <input
                  {...register('requesterName')}
                  placeholder="Nombre completo"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {errors.requesterName && <p className="text-destructive text-xs mt-1">{errors.requesterName.message}</p>}
              </div>
              <div>
                <label className="form-label mb-1.5 block">Cargo</label>
                <input
                  {...register('requesterPosition')}
                  placeholder="Cargo en la empresa"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Email</label>
                <input
                  {...register('requesterEmail')}
                  type="email"
                  placeholder="correo@empresa.com"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Teléfono</label>
                <input
                  {...register('requesterPhone')}
                  placeholder="+57 300 000 0000"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Adjuntos (solo en creación) */}
          {!isEdit && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                Archivos adjuntos
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPendingFiles((prev) => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
              >
                <Paperclip className="w-4 h-4" />
                Seleccionar imágenes o PDF
              </button>
              {pendingFiles.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {pendingFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                      {f.type.startsWith('image/') ? (
                        <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Actualizar ticket' : pendingFiles.length > 0 ? `Crear ticket + ${pendingFiles.length} archivo${pendingFiles.length > 1 ? 's' : ''}` : 'Crear ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
