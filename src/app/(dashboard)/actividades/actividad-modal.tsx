'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Paperclip, FileText, Image } from 'lucide-react';
import { PRIORITY_LABELS } from '@/lib/utils';

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
  description: z.string().min(1, 'Requerido'),
  diagnosis: z.string().optional(),
  solution: z.string().optional(),
  priority: z.string().default('MEDIUM'),
  clientId: z.string().min(1, 'Requerido'),
  technicianId: z.string().min(1, 'Requerido'),
  ticketId: z.string().optional(),
  assetId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ActividadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ActividadModal({ onClose, onSuccess }: ActividadModalProps) {
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { data: res } = await axios.post('/api/actividades', data);
      if (pendingFiles.length > 0) {
        await uploadAndLink(pendingFiles, res.data.id, 'actividades', 'actividades');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar actividad');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Nueva Actividad Técnica</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="form-label mb-1.5 block">Descripción de la actividad *</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe la actividad técnica a realizar..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Prioridad</label>
              <select {...register('priority')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <select {...register('clientId')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Técnico *</label>
              <select {...register('technicianId')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Seleccionar técnico...</option>
                {technicians.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.technicianId && <p className="text-destructive text-xs mt-1">{errors.technicianId.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Hora inicio</label>
              <input type="datetime-local" {...register('startTime')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Hora fin</label>
              <input type="datetime-local" {...register('endTime')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="form-label mb-1.5 block">Diagnóstico técnico</label>
            <textarea {...register('diagnosis')} rows={3} placeholder="Diagnóstico del problema detectado..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <div>
            <label className="form-label mb-1.5 block">Solución aplicada</label>
            <textarea {...register('solution')} rows={3} placeholder="Descripción de la solución implementada..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
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
            <button type="button" onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingFiles.length > 0 ? `Registrar + ${pendingFiles.length} archivo${pendingFiles.length > 1 ? 's' : ''}` : 'Registrar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
