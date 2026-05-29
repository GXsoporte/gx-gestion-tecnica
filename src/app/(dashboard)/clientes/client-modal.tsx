'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const SC = 'w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

const schema = z.object({
  clientType:   z.enum(['COMPANY', 'NATURAL']).default('COMPANY'),
  companyName:  z.string().min(1, 'Requerido'),
  nit:          z.string().optional(),
  cedula:       z.string().optional(),
  contactName:  z.string().min(1, 'Requerido'),
  email:        z.string().email('Email inválido'),
  phone:        z.string().optional(),
  address:      z.string().optional(),
  city:         z.string().optional(),
  country:      z.string().default('Colombia'),
  status:       z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClientModalProps {
  client?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientModal({ client, onClose, onSuccess }: ClientModalProps) {
  const isEdit = !!client;
  const [clientType, setClientType] = useState<'COMPANY' | 'NATURAL'>(
    client?.clientType ?? 'COMPANY'
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: client
      ? { ...client }
      : { clientType: 'COMPANY', status: 'ACTIVE', country: 'Colombia' },
  });

  const switchType = (t: 'COMPANY' | 'NATURAL') => {
    setClientType(t);
    setValue('clientType', t);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await axios.patch(`/api/clientes/${client.id}`, data);
      } else {
        await axios.post('/api/clientes', data);
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
  };

  const isNatural = clientType === 'NATURAL';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            {isEdit && <p className="text-xs text-muted-foreground">{client.code}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

          {/* Toggle tipo de cliente */}
          <div>
            <label className="form-label mb-2 block">Tipo de cliente *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchType('COMPANY')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  !isNatural
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <Building2 className="w-4 h-4" />
                Empresa
              </button>
              <button
                type="button"
                onClick={() => switchType('NATURAL')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  isNatural
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <User className="w-4 h-4" />
                Persona Natural
              </button>
            </div>
            <input type="hidden" {...register('clientType')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="form-label mb-1.5 block">
                {isNatural ? 'Nombre completo *' : 'Nombre de la empresa *'}
              </label>
              <input
                {...register('companyName')}
                placeholder={isNatural ? 'Juan García López' : 'Empresa S.A.S.'}
                className={SC}
              />
              {errors.companyName && <p className="text-destructive text-xs mt-1">{errors.companyName.message}</p>}
            </div>

            {/* Documento de identidad */}
            <div>
              <label className="form-label mb-1.5 block">
                {isNatural ? 'Cédula' : 'NIT'}
              </label>
              {isNatural ? (
                <input {...register('cedula')} placeholder="1.234.567.890" className={SC} />
              ) : (
                <input {...register('nit')} placeholder="900.123.456-7" className={SC} />
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="form-label mb-1.5 block">Estado</label>
              <select {...register('status')} className={SC}>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspendido</option>
              </select>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground mb-3">
              {isNatural ? 'Información de contacto' : 'Contacto principal'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">
                  {isNatural ? 'Nombre *' : 'Nombre de contacto *'}
                </label>
                <input
                  {...register('contactName')}
                  placeholder={isNatural ? 'Juan García López' : 'Juan Pérez'}
                  className={SC}
                />
                {errors.contactName && <p className="text-destructive text-xs mt-1">{errors.contactName.message}</p>}
              </div>

              <div>
                <label className="form-label mb-1.5 block">Correo electrónico *</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className={SC}
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="form-label mb-1.5 block">Teléfono</label>
                <input {...register('phone')} placeholder="+57 300 000 0000" className={SC} />
              </div>

              <div>
                <label className="form-label mb-1.5 block">Ciudad</label>
                <input {...register('city')} placeholder="Bogotá" className={SC} />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Dirección</label>
                <input {...register('address')} placeholder="Calle 72 #10-20" className={SC} />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Observaciones</label>
                <textarea
                  {...register('observations')}
                  rows={2}
                  placeholder="Notas adicionales..."
                  className={`${SC} resize-none`}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border text-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Actualizar cliente' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
