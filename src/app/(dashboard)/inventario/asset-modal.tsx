'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/utils';

const SELECT_CLASS = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer';
const INPUT_CLASS  = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

const BRANDS = [
  'Dell','HP','Lenovo','ASUS','Acer','Apple','Samsung','MSI',
  'Toshiba','Huawei','Microsoft','LG','Sony','Epson','Canon',
  'Brother','Xerox','Cisco','Ubiquiti','TP-Link','Otra',
];

const OPERATING_SYSTEMS = [
  'Windows 11 Pro','Windows 11 Home',
  'Windows 10 Pro','Windows 10 Home',
  'Windows Server 2022','Windows Server 2019',
  'macOS Sonoma','macOS Ventura','macOS Monterey',
  'Ubuntu 24.04 LTS','Ubuntu 22.04 LTS',
  'Debian','CentOS','Chrome OS','Android',
  'Sin sistema operativo','Otro',
];

const schema = z.object({
  type:            z.string().min(1, 'Selecciona el tipo de equipo'),
  brand:           z.string().optional(),
  model:           z.string().optional(),
  serial:          z.string().optional(),
  assignedUser:    z.string().optional(),
  area:            z.string().optional(),
  location:        z.string().optional(),
  status:          z.string().default('ACTIVE'),
  processor:       z.string().optional(),
  ram:             z.string().optional(),
  storage:         z.string().optional(),
  operatingSystem: z.string().optional(),
  softwareList:    z.string().optional(),
  purchaseDate:    z.string().optional(),
  warrantyExpiry:  z.string().optional(),
  observations:    z.string().optional(),
  clientId:        z.string().min(1, 'Selecciona un cliente'),
});

type FormData = z.infer<typeof schema>;

interface AssetModalProps {
  asset?: any;
  onClose: () => void;
  onSuccess: () => void;
}

function toDateInput(val: string | null | undefined): string {
  if (!val) return '';
  return val.substring(0, 10);
}

export function AssetModal({ asset, onClose, onSuccess }: AssetModalProps) {
  const isEdit = !!asset;

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await axios.get('/api/clientes');
      return data.data;
    },
  });

  const defaultValues: Partial<FormData> = asset
    ? {
        type:            asset.type            ?? '',
        brand:           asset.brand           ?? '',
        model:           asset.model           ?? '',
        serial:          asset.serial          ?? '',
        assignedUser:    asset.assignedUser    ?? '',
        area:            asset.area            ?? '',
        location:        asset.location        ?? '',
        status:          asset.status          ?? 'ACTIVE',
        processor:       asset.processor       ?? '',
        ram:             asset.ram             ?? '',
        storage:         asset.storage         ?? '',
        operatingSystem: asset.operatingSystem ?? '',
        softwareList:    asset.softwareList    ?? '',
        purchaseDate:    toDateInput(asset.purchaseDate),
        warrantyExpiry:  toDateInput(asset.warrantyExpiry),
        observations:    asset.observations    ?? '',
        clientId:        asset.clientId        ?? '',
      }
    : { status: 'ACTIVE', clientId: '' };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

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

  // Muestra toast cuando la validación falla (para que el usuario sepa qué falta)
  const onError = (errs: any) => {
    const first = Object.values(errs)[0] as any;
    toast.error(first?.message ?? 'Completa los campos requeridos');
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

        <form onSubmit={handleSubmit(onSubmit, onError)} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Tipo */}
            <div>
              <label className="form-label mb-1.5 block">Tipo de equipo *</label>
              <select {...register('type')} className={SELECT_CLASS}>
                <option value="">Seleccionar tipo...</option>
                {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {errors.type && <p className="text-destructive text-xs mt-1">{errors.type.message}</p>}
            </div>

            {/* Estado */}
            <div>
              <label className="form-label mb-1.5 block">Estado</label>
              <select {...register('status')} className={SELECT_CLASS}>
                <option value="ACTIVE">Activo</option>
                <option value="MAINTENANCE">En mantenimiento</option>
                <option value="DIAGNOSIS">En diagnóstico</option>
                <option value="BORROWED">Prestado</option>
                <option value="DAMAGED">Dañado</option>
                <option value="RETIRED">Dado de baja</option>
              </select>
            </div>

            {/* Marca — select con opciones */}
            <div>
              <label className="form-label mb-1.5 block">Marca</label>
              <select {...register('brand')} className={SELECT_CLASS}>
                <option value="">Seleccionar marca...</option>
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Modelo */}
            <div>
              <label className="form-label mb-1.5 block">Modelo</label>
              <input {...register('model')} placeholder="OptiPlex 7090, Vivobook 14..." className={INPUT_CLASS} />
            </div>

            {/* Serial */}
            <div>
              <label className="form-label mb-1.5 block">Serial</label>
              <input {...register('serial')} placeholder="Número de serie" className={INPUT_CLASS} />
            </div>

            {/* Cliente — Controller para evitar problemas de sincronización DOM */}
            <div>
              <label className="form-label mb-1.5 block">Cliente *</label>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={clientsLoading}
                    className={SELECT_CLASS}
                  >
                    <option value="">{clientsLoading ? 'Cargando...' : 'Seleccionar cliente...'}</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                )}
              />
              {errors.clientId && <p className="text-destructive text-xs mt-1">{errors.clientId.message}</p>}
            </div>

            {/* Usuario asignado */}
            <div>
              <label className="form-label mb-1.5 block">Usuario asignado</label>
              <input {...register('assignedUser')} placeholder="Nombre del usuario" className={INPUT_CLASS} />
            </div>

            {/* Área */}
            <div>
              <label className="form-label mb-1.5 block">Área</label>
              <input {...register('area')} placeholder="Contabilidad, Gerencia..." className={INPUT_CLASS} />
            </div>

          </div>

          {/* Especificaciones técnicas */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold mb-3">Especificaciones técnicas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Procesador */}
              <div>
                <label className="form-label mb-1.5 block">Procesador</label>
                <input {...register('processor')} placeholder="Intel Core i7-11700, AMD Ryzen 5..." className={INPUT_CLASS} />
              </div>

              {/* RAM */}
              <div>
                <label className="form-label mb-1.5 block">RAM</label>
                <select {...register('ram')} className={SELECT_CLASS}>
                  <option value="">Seleccionar RAM...</option>
                  {['4 GB DDR4','8 GB DDR4','16 GB DDR4','32 GB DDR4','64 GB DDR4',
                    '8 GB DDR5','16 GB DDR5','32 GB DDR5','64 GB DDR5'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Almacenamiento */}
              <div>
                <label className="form-label mb-1.5 block">Almacenamiento</label>
                <select {...register('storage')} className={SELECT_CLASS}>
                  <option value="">Seleccionar almacenamiento...</option>
                  {['128 GB SSD','256 GB SSD','480 GB SSD','512 GB SSD',
                    '1 TB SSD','2 TB SSD','500 GB HDD','1 TB HDD','2 TB HDD'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Sistema operativo — select con opciones */}
              <div>
                <label className="form-label mb-1.5 block">Sistema operativo</label>
                <select {...register('operatingSystem')} className={SELECT_CLASS}>
                  <option value="">Seleccionar SO...</option>
                  {OPERATING_SYSTEMS.map((os) => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </select>
              </div>

              {/* Fecha de compra */}
              <div>
                <label className="form-label mb-1.5 block">Fecha de compra</label>
                <input type="date" {...register('purchaseDate')} className={INPUT_CLASS} />
              </div>

              {/* Garantía */}
              <div>
                <label className="form-label mb-1.5 block">Vencimiento garantía</label>
                <input type="date" {...register('warrantyExpiry')} className={INPUT_CLASS} />
              </div>

              {/* Software */}
              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Software instalado</label>
                <textarea {...register('softwareList')} rows={2} placeholder="Office 365, Adobe, SAP..." className={`${INPUT_CLASS} resize-none`} />
              </div>

              {/* Observaciones */}
              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Observaciones</label>
                <textarea {...register('observations')} rows={2} placeholder="Notas adicionales..." className={`${INPUT_CLASS} resize-none`} />
              </div>

            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || clientsLoading}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Actualizar' : 'Registrar activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
