'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Paperclip, FileText, Image } from 'lucide-react';

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

const schema = z.object({
  title: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE']),
  scheduledDate: z.string().min(1, 'Requerido'),
  clientId: z.string().min(1, 'Requerido'),
  assetId: z.string().optional(),
  technicianId: z.string().min(1, 'Requerido'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function MantenimientoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await axios.get('/api/clientes');
      return data.data;
    },
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['users-select', 'TECHNICIAN,COMPANY_ADMIN'],
    queryFn: async () => {
      const [t, a] = await Promise.all([
        axios.get('/api/usuarios?role=TECHNICIAN&active=true'),
        axios.get('/api/usuarios?role=COMPANY_ADMIN&active=true'),
      ]);
      return [...(t.data.data || []), ...(a.data.data || [])];
    },
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PREVENTIVE' },
  });

  const selectedClientId = watch('clientId');

  const { data: assets = [] } = useQuery({
    queryKey: ['assets-for-client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data } = await axios.get(`/api/inventario?clientId=${selectedClientId}`);
      return data.data;
    },
    enabled: !!selectedClientId,
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { data: res } = await axios.post('/api/mantenimientos', data);
      if (pendingFiles.length > 0) {
        await uploadAndLink(pendingFiles, res.data.id, 'mantenimientos', 'mantenimientos');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al programar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Programar Mantenimiento</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label mb-1.5 block">Título *</label>
            <input {...register('title')} placeholder="Mantenimiento preventivo mensual" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Tipo *</label>
              <select {...register('type')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                <option value="PREVENTIVE">Preventivo</option>
                <option value="CORRECTIVE">Correctivo</option>
                <option value="PREDICTIVE">Predictivo</option>
              </select>
            </div>
            <div>
              <label className="form-label mb-1.5 block">Fecha programada *</label>
              <input type="datetime-local" {...register('scheduledDate')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none" />
              {errors.scheduledDate && <p className="text-destructive text-xs mt-1">{errors.scheduledDate.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <select {...register('clientId')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Equipo</label>
              <select {...register('assetId')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none" disabled={!selectedClientId}>
                <option value="">General (sin equipo)</option>
                {assets.map((a: any) => <option key={a.id} value={a.id}>{a.brand} {a.model}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label mb-1.5 block">Técnico *</label>
              <select {...register('technicianId')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                <option value="">Seleccionar técnico...</option>
                {technicians.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {errors.technicianId && <p className="text-destructive text-xs mt-1">{errors.technicianId.message}</p>}
            </div>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Descripción</label>
            <textarea {...register('description')} rows={3} placeholder="Describe el mantenimiento a realizar..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none resize-none" />
          </div>
          {/* Adjuntos */}
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingFiles.length > 0 ? `Programar + ${pendingFiles.length} archivo${pendingFiles.length > 1 ? 's' : ''}` : 'Programar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
