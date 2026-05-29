'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';

const schema = z.object({
  companyName: z.string().min(1, 'Requerido'),
  nit: z.string().optional(),
  contactName: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('Colombia'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: client || { status: 'ACTIVE', country: 'Colombia' },
  });

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label mb-1.5 block">Nombre de la empresa *</label>
              <input
                {...register('companyName')}
                placeholder="Empresa S.A.S."
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.companyName && <p className="text-destructive text-xs mt-1">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="form-label mb-1.5 block">NIT</label>
              <input
                {...register('nit')}
                placeholder="900.123.456-7"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="form-label mb-1.5 block">Estado</label>
              <select
                {...register('status')}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspendido</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground mb-3">Contacto principal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">Nombre de contacto *</label>
                <input
                  {...register('contactName')}
                  placeholder="Juan Pérez"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {errors.contactName && <p className="text-destructive text-xs mt-1">{errors.contactName.message}</p>}
              </div>

              <div>
                <label className="form-label mb-1.5 block">Correo electrónico *</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="contacto@empresa.com"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="form-label mb-1.5 block">Teléfono</label>
                <input
                  {...register('phone')}
                  placeholder="+57 300 000 0000"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="form-label mb-1.5 block">Ciudad</label>
                <input
                  {...register('city')}
                  placeholder="Bogotá"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Dirección</label>
                <input
                  {...register('address')}
                  placeholder="Calle 72 #10-20"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Observaciones</label>
                <textarea
                  {...register('observations')}
                  rows={3}
                  placeholder="Notas adicionales sobre el cliente..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>
          </div>

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
              {isEdit ? 'Actualizar cliente' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
