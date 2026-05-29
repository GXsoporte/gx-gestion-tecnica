'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';

const schema = z.object({
  ticketId: z.string().min(1, 'Selecciona un ticket'),
  assetId: z.string().min(1, 'Selecciona un equipo'),
  clientId: z.string().min(1, 'Selecciona un cliente'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  problemCause: z.string().optional(),
  recommendation: z.string().optional(),
  requiresRepair: z.boolean().default(true),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  estimatedTime: z.string().optional(),
  technicianNotes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function DiagnosticoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: session } = useSession();

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets-for-diag'],
    queryFn: async () => {
      const { data } = await axios.get('/api/tickets?status=OPEN,ASSIGNED,IN_DIAGNOSIS');
      return data.data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => { const { data } = await axios.get('/api/clientes'); return data.data; },
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { requiresRepair: true },
  });

  const selectedClientId = watch('clientId');

  const { data: assets = [] } = useQuery({
    queryKey: ['assets-for-diag', selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data } = await axios.get(`/api/inventario?clientId=${selectedClientId}`);
      return data.data || [];
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await axios.post('/api/diagnosticos', data);
      onSuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al crear diagnóstico');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold">Nuevo Diagnóstico</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <select {...register('clientId')} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Equipo *</label>
              <select {...register('assetId')} disabled={!selectedClientId}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50">
                <option value="">Seleccionar...</option>
                {assets.map((a: any) => <option key={a.id} value={a.id}>{a.brand} {a.model} — {a.serial}</option>)}
              </select>
              {errors.assetId && <p className="text-destructive text-xs mt-1">{errors.assetId.message}</p>}
            </div>
          </div>

          <div>
            <label className="form-label mb-1.5 block">Ticket relacionado *</label>
            <select {...register('ticketId')} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Seleccionar ticket...</option>
              {tickets.map((t: any) => <option key={t.id} value={t.id}>{t.ticketNumber} — {t.subject}</option>)}
            </select>
            {errors.ticketId && <p className="text-destructive text-xs mt-1">{errors.ticketId.message}</p>}
          </div>

          <div>
            <label className="form-label mb-1.5 block">Descripción técnica *</label>
            <textarea {...register('description')} rows={3} placeholder="Describe el diagnóstico técnico..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
            {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="form-label mb-1.5 block">Causa del problema</label>
            <textarea {...register('problemCause')} rows={2} placeholder="Causa identificada del fallo..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <div>
            <label className="form-label mb-1.5 block">Recomendación</label>
            <textarea {...register('recommendation')} rows={2} placeholder="Qué se recomienda hacer..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Costo estimado</label>
              <input type="number" min={0} step={1000} {...register('estimatedCost')} placeholder="0"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Tiempo estimado</label>
              <input {...register('estimatedTime')} placeholder="Ej: 2-3 días hábiles"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="requiresRepair" {...register('requiresRepair')} className="rounded" />
            <label htmlFor="requiresRepair" className="text-sm text-foreground">Requiere reparación</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Diagnóstico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
