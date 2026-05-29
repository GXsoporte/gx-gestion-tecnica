'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { USER_ROLE_LABELS } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(['COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN', 'CLIENT']),
  phone: z.string().optional(),
  position: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function UserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'TECHNICIAN' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await axios.post('/api/usuarios', data);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear usuario');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Nuevo Usuario</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label mb-1.5 block">Nombre completo *</label>
            <input {...register('name')} placeholder="Juan García" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label mb-1.5 block">Email *</label>
            <input {...register('email')} type="email" placeholder="usuario@empresa.com" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label mb-1.5 block">Contraseña *</label>
            <input {...register('password')} type="password" placeholder="Mínimo 8 caracteres" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Rol *</label>
              <select {...register('role')} className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none">
                <option value="TECHNICIAN">Técnico</option>
                <option value="COORDINATOR">Coordinador</option>
                <option value="COMPANY_ADMIN">Administrador</option>
                <option value="CLIENT">Cliente</option>
              </select>
            </div>
            <div>
              <label className="form-label mb-1.5 block">Teléfono</label>
              <input {...register('phone')} placeholder="+57 300 000 0000" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="form-label mb-1.5 block">Cargo</label>
              <input {...register('position')} placeholder="Técnico Senior, Coordinador..." className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
