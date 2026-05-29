'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/utils';

const schema = z.object({
  type: z.string().min(1, 'Requerido'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  assignedUser: z.string().optional(),
  area: z.string().optional(),
  location: z.string().optional(),
  status: z.string().default('ACTIVE'),
  processor: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  operatingSystem: z.string().optional(),
  softwareList: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  observations: z.string().optional(),
  clientId: z.string().min(1, 'Requerido'),
});

type FormData = z.infer<typeof schema>;

interface AssetModalProps {
  asset?: any;
  onClose: () => void;
  onSuccess: () => void;
}

function toDateInput(val: string | null | undefined): string {
  if (!val) return '';
  return val.substring(0, 10); // "2024-01-15T00:00:00.000Z" → "2024-01-15"
}

export function AssetModal({ asset, onClose, onSuccess }: AssetModalProps) {
  const isEdit = !!asset;

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await axios.get('/api/clientes');
      return data.data;
    },
  });

  const defaultValues = asset
    ? {
        ...asset,
        purchaseDate: toDateInput(asset.purchaseDate),
        warrantyExpiry: toDateInput(asset.warrantyExpiry),
      }
    : { status: 'ACTIVE' };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // El select de clientes carga async: una vez disponibles, sincronizamos
  // el valor en el DOM para que react-hook-form lo lea correctamente.
  useEffect(() => {
    if (isEdit && clients.length > 0 && asset?.clientId) {
      setValue('clientId', asset.clientId, { shouldValidate: false });
    }
  }, [clients.length]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await axios.patch(`/api/inventario/${asset.id}`, data);
      } else {
        await axios.post('/api/inventario', data);
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
            <h2 className="text-lg font-bold">{isEdit ? 'Editar Activo' : 'Registrar Activo'}</h2>
            {isEdit && <p className="text-xs text-muted-foreground">{asset.assetNumber}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Tipo de equipo *</label>
              <select
                {...register('type')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Seleccionar tipo...</option>
                {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {errors.type && <p className="text-destructive text-xs mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Estado</label>
              <select
                {...register('status')}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ACTIVE">Activo</option>
                <option value="MAINTENANCE">En mantenimiento</option>
                <option value="DIAGNOSIS">En diagnóstico</option>
                <option value="BORROWED">Prestado</option>
                <option value="DAMAGED">Dañado</option>
                <option value="RETIRED">Dado de baja</option>
              </select>
            </div>
            <div>
              <label className="form-label mb-1.5 block">Marca</label>
              <input {...register('brand')} placeholder="Dell, HP, Lenovo..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Modelo</label>
              <input {...register('model')} placeholder="OptiPlex 7090..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Serial</label>
              <input {...register('serial')} placeholder="Serial del equipo" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <select {...register('clientId')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Seleccionar cliente...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>
            <div>
              <label className="form-label mb-1.5 block">Usuario asignado</label>
              <input {...register('assignedUser')} placeholder="Nombre del usuario" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Área</label>
              <input {...register('area')} placeholder="Contabilidad, Gerencia..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold mb-3">Especificaciones técnicas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">Procesador</label>
                <input {...register('processor')} placeholder="Intel Core i7-11700" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">RAM</label>
                <input {...register('ram')} placeholder="16 GB DDR4" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Almacenamiento</label>
                <input {...register('storage')} placeholder="512 GB SSD" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Sistema operativo</label>
                <input {...register('operatingSystem')} placeholder="Windows 11 Pro" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Fecha de compra</label>
                <input type="date" {...register('purchaseDate')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Vencimiento garantía</label>
                <input type="date" {...register('warrantyExpiry')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Software instalado</label>
                <textarea {...register('softwareList')} rows={2} placeholder="Office 365, Adobe, SAP..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Observaciones</label>
                <textarea {...register('observations')} rows={2} placeholder="Notas adicionales..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Actualizar' : 'Registrar activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
