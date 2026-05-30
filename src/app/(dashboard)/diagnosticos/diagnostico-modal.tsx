'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2, Ticket, Monitor, AlertCircle } from 'lucide-react';

const SC = 'w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

const schema = z.object({
  ticketId:      z.string().min(1, 'Selecciona un ticket'),
  clientId:      z.string().min(1, 'Requerido'),
  assetId:       z.string().min(1, 'Selecciona un equipo'),
  description:   z.string().min(10, 'Mínimo 10 caracteres'),
  problemCause:  z.string().optional(),
  recommendation: z.string().optional(),
  requiresRepair: z.boolean().default(true),
  estimatedCost:  z.coerce.number().min(0).optional().nullable(),
  estimatedTime:  z.string().optional(),
  technicianNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function DiagnosticoModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { requiresRepair: true },
  });

  const selectedTicketId = watch('ticketId');
  const selectedClientId = watch('clientId');

  /* ── Tickets abiertos ──────────────────────────────────── */
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets-for-diag'],
    queryFn: async () => {
      const { data } = await axios.get('/api/tickets');
      // Filtrar solo tickets activos (no cerrados/resueltos)
      return (data.data || []).filter(
        (t: any) => !['CLOSED', 'RESOLVED'].includes(t.status)
      );
    },
  });

  /* ── Activos del cliente (cargados del ticket) ─────────── */
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-for-diag', selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data } = await axios.get(`/api/inventario?clientId=${selectedClientId}`);
      return data.data || [];
    },
  });

  /* ── Al cambiar ticket: auto-rellenar campos ───────────── */
  useEffect(() => {
    if (!selectedTicketId) return;
    const ticket = tickets.find((t: any) => t.id === selectedTicketId);
    if (!ticket) return;

    // Cargar clientId del ticket
    if (ticket.clientId) {
      setValue('clientId', ticket.clientId, { shouldValidate: true });
    }
    // Pre-rellenar descripción del problema desde el ticket
    if (ticket.description) {
      setValue('description', ticket.description, { shouldValidate: true });
    }
    // Si el ticket tiene equipo relacionado, pre-seleccionarlo
    if (ticket.relatedAssetId) {
      setValue('assetId', ticket.relatedAssetId, { shouldValidate: true });
    } else {
      setValue('assetId', '');
    }
  }, [selectedTicketId, tickets]);

  /* ── Cuando cargan los activos, re-sincronizar assetId ─── */
  useEffect(() => {
    if (!selectedTicketId || assets.length === 0) return;
    const ticket = tickets.find((t: any) => t.id === selectedTicketId);
    if (ticket?.relatedAssetId) {
      const assetExists = assets.some((a: any) => a.id === ticket.relatedAssetId);
      if (assetExists) {
        setValue('assetId', ticket.relatedAssetId, { shouldValidate: true });
      }
    }
  }, [assets]);

  const onSubmit = async (data: FormData) => {
    try {
      await axios.post('/api/diagnosticos', data);
      onSuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al crear diagnóstico');
    }
  };

  const onError = (errs: any) => {
    const first = Object.values(errs)[0] as any;
    toast.error(first?.message ?? 'Completa los campos requeridos');
  };

  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold">Nuevo Diagnóstico</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="p-6 space-y-5">

          {/* ── PASO 1: Ticket ── */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
            <label className="form-label mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-400 font-semibold">Ticket relacionado *</span>
            </label>
            <Controller
              name="ticketId"
              control={control}
              render={({ field }) => (
                <select {...field} className={`${SC} border-blue-300`}>
                  <option value="">
                    {ticketsLoading ? 'Cargando tickets...' : 'Seleccionar ticket...'}
                  </option>
                  {tickets.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.ticketNumber} — {t.subject}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.ticketId && (
              <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.ticketId.message}
              </p>
            )}

            {/* Info del ticket seleccionado */}
            {selectedTicket && (
              <div className="mt-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p><span className="font-semibold">Cliente:</span> {selectedTicket.client?.companyName || '—'}</p>
                <p><span className="font-semibold">Solicitante:</span> {selectedTicket.requesterName}</p>
                {selectedTicket.relatedAsset && (
                  <p><span className="font-semibold">Equipo:</span> {selectedTicket.relatedAsset?.brand} {selectedTicket.relatedAsset?.model}</p>
                )}
              </div>
            )}
          </div>

          {/* ── PASO 2: Equipo (se carga automáticamente del ticket) ── */}
          <div>
            <label className="form-label mb-1.5 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span>Equipo *</span>
              {assetsLoading && <span className="text-xs text-muted-foreground">(cargando...)</span>}
            </label>
            <Controller
              name="assetId"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  disabled={!selectedClientId || assetsLoading}
                  className={`${SC} disabled:opacity-50`}
                >
                  <option value="">
                    {!selectedClientId
                      ? 'Selecciona un ticket primero'
                      : assetsLoading
                      ? 'Cargando equipos...'
                      : 'Seleccionar equipo...'}
                  </option>
                  {assets.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.brand} {a.model}{a.serial ? ` — ${a.serial}` : ''}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.assetId && (
              <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.assetId.message}
              </p>
            )}
          </div>

          {/* Campo oculto para clientId (se rellena automáticamente) */}
          <input type="hidden" {...register('clientId')} />

          {/* ── Descripción del problema (pre-rellena desde el ticket) ── */}
          <div>
            <label className="form-label mb-1.5 block">
              Descripción del problema *
              {selectedTicket && (
                <span className="ml-2 text-[10px] font-normal text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                  cargada del ticket
                </span>
              )}
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Describe el problema reportado..."
              className={`${SC} resize-none`}
            />
            {errors.description && (
              <p className="text-destructive text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* ── Causa del problema ── */}
          <div>
            <label className="form-label mb-1.5 block">Causa identificada</label>
            <textarea
              {...register('problemCause')}
              rows={2}
              placeholder="Causa del fallo encontrada..."
              className={`${SC} resize-none`}
            />
          </div>

          {/* ── Recomendación ── */}
          <div>
            <label className="form-label mb-1.5 block">Recomendación</label>
            <textarea
              {...register('recommendation')}
              rows={2}
              placeholder="Qué se recomienda hacer..."
              className={`${SC} resize-none`}
            />
          </div>

          {/* ── Estimados ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Costo estimado ($)</label>
              <input
                type="number" min={0} step={1000}
                {...register('estimatedCost')}
                placeholder="0"
                className={SC}
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Tiempo estimado</label>
              <input
                {...register('estimatedTime')}
                placeholder="Ej: 2-3 días hábiles"
                className={SC}
              />
            </div>
          </div>

          {/* ── Notas del técnico ── */}
          <div>
            <label className="form-label mb-1.5 block">Notas del técnico</label>
            <textarea
              {...register('technicianNotes')}
              rows={2}
              placeholder="Notas internas del técnico..."
              className={`${SC} resize-none`}
            />
          </div>

          {/* ── Requiere reparación ── */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" {...register('requiresRepair')} className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm text-foreground">Requiere reparación</span>
          </label>

          {/* ── Botones ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Diagnóstico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
