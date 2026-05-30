'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2, Paperclip, FileText, Image, Trash2 } from 'lucide-react';

const schema = z.object({
  diagnosisId: z.string().min(1, 'Selecciona un diagnóstico aprobado'),
  ticketId: z.string().min(1),
  assetId: z.string().min(1),
  clientId: z.string().min(1),
  activitiesDone: z.string().optional(),
  spareParts: z.string().optional(),
  installedSoftware: z.string().optional(),
  configurations: z.string().optional(),
  testsDone: z.string().optional(),
  finalResult: z.string().optional(),
  recommendations: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SolucionModal({
  onClose,
  onSuccess,
  prefillDiagnosisId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  prefillDiagnosisId?: string;
}) {
  const { data: approvedDiagnoses = [] } = useQuery({
    queryKey: ['diagnoses-approved'],
    queryFn: async () => {
      const { data } = await axios.get('/api/diagnosticos?status=APPROVED');
      return data.data || [];
    },
  });

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: prefillDiagnosisId ? { diagnosisId: prefillDiagnosisId } : {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const selectedDiagId = watch('diagnosisId');
  const selectedDiag = approvedDiagnoses.find((d: any) => d.id === selectedDiagId);

  // Auto-fill cuando cambia el diagnóstico seleccionado
  const handleDiagChange = (diagId: string) => {
    setValue('diagnosisId', diagId);
    const diag = approvedDiagnoses.find((d: any) => d.id === diagId);
    if (diag) {
      setValue('ticketId', diag.ticketId);
      setValue('assetId', diag.assetId);
      setValue('clientId', diag.clientId);
    }
  };

  // Auto-fill cuando cargan los diagnósticos con prefill
  if (prefillDiagnosisId && selectedDiagId === prefillDiagnosisId && approvedDiagnoses.length > 0) {
    const diag = approvedDiagnoses.find((d: any) => d.id === prefillDiagnosisId);
    if (diag && !watch('ticketId')) {
      setValue('ticketId', diag.ticketId);
      setValue('assetId', diag.assetId);
      setValue('clientId', diag.clientId);
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const { data: res } = await axios.post('/api/soluciones', data);
      const solutionId = res.data?.id;

      // Subir archivos adjuntos si los hay
      if (solutionId && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const fd = new globalThis.FormData();
            fd.append('file', file);
            fd.append('folder', 'soluciones');
            const { data: up } = await axios.post('/api/upload', fd);
            await axios.post(`/api/soluciones/${solutionId}/attachments`, up.data);
          } catch {
            toast.error(`No se pudo adjuntar ${file.name}`);
          }
        }
      }

      onSuccess();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al crear solución');
    }
  };

  const fieldClass = 'w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-lg font-bold">Nueva Solución / Reparación</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Diagnóstico selector */}
          <div>
            <label className="form-label mb-1.5 block">Diagnóstico aprobado *</label>
            <select
              value={selectedDiagId || ''}
              onChange={e => handleDiagChange(e.target.value)}
              className={fieldClass}
            >
              <option value="">Seleccionar diagnóstico aprobado...</option>
              {approvedDiagnoses.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.diagnosisNumber} — {d.client?.companyName} — {d.asset?.brand} {d.asset?.model}
                </option>
              ))}
            </select>
            {errors.diagnosisId && <p className="text-destructive text-xs mt-1">{errors.diagnosisId.message}</p>}
            {approvedDiagnoses.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">No hay diagnósticos aprobados disponibles. El cliente debe aprobar un diagnóstico primero.</p>
            )}
          </div>

          {/* Info del diagnóstico seleccionado */}
          {selectedDiag && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Información del diagnóstico</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p className="text-xs text-muted-foreground">Cliente: <span className="font-medium text-foreground">{selectedDiag.client?.companyName}</span></p>
                <p className="text-xs text-muted-foreground">Ticket: <span className="font-mono font-medium text-foreground">{selectedDiag.ticket?.ticketNumber}</span></p>
                <p className="text-xs text-muted-foreground">Equipo: <span className="font-medium text-foreground">{selectedDiag.asset?.brand} {selectedDiag.asset?.model}</span></p>
                {selectedDiag.estimatedCost && (
                  <p className="text-xs text-muted-foreground">Costo estimado: <span className="font-medium text-foreground">${Number(selectedDiag.estimatedCost).toLocaleString('es-CO')}</span></p>
                )}
              </div>
              {selectedDiag.recommendation && (
                <p className="text-xs text-muted-foreground mt-1">Recomendación: <span className="italic">{selectedDiag.recommendation}</span></p>
              )}
            </div>
          )}

          {/* Actividades realizadas */}
          <div>
            <label className="form-label mb-1.5 block">Actividades realizadas</label>
            <textarea {...register('activitiesDone')} rows={3}
              placeholder="Describe las actividades técnicas realizadas..."
              className={fieldClass} />
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Repuestos utilizados</label>
              <textarea {...register('spareParts')} rows={2}
                placeholder="Lista de repuestos y partes..."
                className={fieldClass} />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Software instalado</label>
              <textarea {...register('installedSoftware')} rows={2}
                placeholder="Software, drivers, actualizaciones..."
                className={fieldClass} />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Configuraciones aplicadas</label>
              <textarea {...register('configurations')} rows={2}
                placeholder="Configuraciones y ajustes realizados..."
                className={fieldClass} />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Pruebas realizadas</label>
              <textarea {...register('testsDone')} rows={2}
                placeholder="Pruebas y verificaciones efectuadas..."
                className={fieldClass} />
            </div>
          </div>

          {/* Resultado final */}
          <div>
            <label className="form-label mb-1.5 block">Resultado final</label>
            <textarea {...register('finalResult')} rows={2}
              placeholder="Descripción del resultado obtenido..."
              className={fieldClass} />
          </div>

          {/* Recomendaciones */}
          <div>
            <label className="form-label mb-1.5 block">Recomendaciones al cliente</label>
            <textarea {...register('recommendations')} rows={2}
              placeholder="Recomendaciones para evitar futuros fallos..."
              className={fieldClass} />
          </div>

          {/* ── Evidencias / Archivos adjuntos ── */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Evidencias y archivos adjuntos</p>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPendingFiles(prev => [...prev, ...files]);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl py-3.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted/20 transition-colors flex items-center justify-center gap-2"
            >
              <Paperclip className="w-4 h-4" />
              Seleccionar imágenes, PDF o documentos
            </button>

            {pendingFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-3 py-2.5">
                    {f.type.startsWith('image/')
                      ? <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      : <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    }
                    <span className="flex-1 text-sm truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 hover:text-destructive text-muted-foreground flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {pendingFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {pendingFiles.length} archivo{pendingFiles.length > 1 ? 's' : ''} listo{pendingFiles.length > 1 ? 's' : ''} para subir
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || !selectedDiagId}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingFiles.length > 0
                ? `Crear Solución + ${pendingFiles.length} archivo${pendingFiles.length > 1 ? 's' : ''}`
                : 'Crear Solución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
