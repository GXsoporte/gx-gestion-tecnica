'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  X, Loader2, Eye, EyeOff, Monitor, Shield, Mail,
  Copy, Briefcase, Plus, Trash2, Globe,
} from 'lucide-react';

const SC = 'w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

interface Platform {
  name: string;
  username: string;
  password: string;
}

const platformSchema = z.object({
  name:     z.string().min(1),
  username: z.string().optional(),
  password: z.string().optional(),
});

const schema = z.object({
  name:           z.string().min(1, 'El nombre es requerido'),
  cargo:          z.string().optional(),
  pcUsername:     z.string().optional(),
  pcPassword:     z.string().optional(),
  adminUsername:  z.string().optional(),
  adminPassword:  z.string().optional(),
  email1:         z.string().optional(),
  email1Password: z.string().optional(),
  email2:         z.string().optional(),
  email2Password: z.string().optional(),
  notes:          z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClientUserModalProps {
  clientId:     string;
  clientName:   string;
  clientType?:  string;   // COMPANY | NATURAL
  clientEmail?: string;
  user?:        any;
  onClose:      () => void;
  onSuccess:    () => void;
}

/* ─── Password field con ojo ─────────────────────────────── */
function PwdInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        className={`${SC} pr-10`}
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

/* ─── Password registrada con react-hook-form ────────────── */
function RhfPwd({ name, register }: { name: any; register: any }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...register(name)} type={show ? 'text' : 'password'} placeholder="••••••••" className={`${SC} pr-10`} />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function ClientUserModal({
  clientId, clientName, clientType, clientEmail, user, onClose, onSuccess,
}: ClientUserModalProps) {
  const isEdit    = !!user;
  const isNatural = clientType === 'NATURAL';
  const isCompany = clientType === 'COMPANY';

  /* ── Estado local: plataformas dinámicas ──────────────── */
  const [platforms, setPlatforms] = useState<Platform[]>(
    user?.platforms ?? []
  );

  const addPlatform = () =>
    setPlatforms(prev => [...prev, { name: '', username: '', password: '' }]);

  const removePlatform = (i: number) =>
    setPlatforms(prev => prev.filter((_, idx) => idx !== i));

  const updatePlatform = (i: number, field: keyof Platform, val: string) =>
    setPlatforms(prev =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p))
    );

  /* ── React-hook-form ──────────────────────────────────── */
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          name:           user.name           ?? '',
          cargo:          user.cargo          ?? '',
          pcUsername:     user.pcUsername     ?? '',
          pcPassword:     user.pcPassword     ?? '',
          adminUsername:  user.adminUsername  ?? '',
          adminPassword:  user.adminPassword  ?? '',
          email1:         user.email1         ?? '',
          email1Password: user.email1Password ?? '',
          email2:         user.email2         ?? '',
          email2Password: user.email2Password ?? '',
          notes:          user.notes          ?? '',
        }
      : {},
  });

  const fillFromClient = () => {
    setValue('name', clientName);
    if (clientEmail) setValue('email1', clientEmail);
    toast.info('Datos del cliente copiados');
  };

  const onSubmit = async (data: FormData) => {
    // Validar que las plataformas tengan nombre
    const validPlatforms = platforms.filter(p => p.name.trim());
    try {
      const payload = { ...data, platforms: validPlatforms };
      if (isEdit) {
        await axios.patch(`/api/clientes/${clientId}/usuarios/${user.id}`, payload);
      } else {
        await axios.post(`/api/clientes/${clientId}/usuarios`, payload);
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-bold">{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

          {/* ── Nombre + botón copiar ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label">Nombre *</label>
                {isNatural && !isEdit && (
                  <button type="button" onClick={fillFromClient}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Copy className="w-3 h-3" /> Usar datos del cliente
                  </button>
                )}
              </div>
              <input {...register('name')} placeholder="Juan García" className={SC} />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Cargo — solo para empresa */}
            {isCompany && (
              <div>
                <label className="form-label mb-1.5 block">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    Cargo
                  </span>
                </label>
                <input {...register('cargo')} placeholder="Auxiliar contable, Gerente..." className={SC} />
              </div>
            )}
          </div>

          {/* ── Usuario PC ── */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold">Usuario PC</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label mb-1.5 block text-xs">Usuario</label>
                <input {...register('pcUsername')} placeholder="juan.garcia" className={SC} />
              </div>
              <div>
                <label className="form-label mb-1.5 block text-xs">Contraseña</label>
                <RhfPwd name="pcPassword" register={register} />
              </div>
            </div>
          </div>

          {/* ── Usuario Admin ── */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold">Usuario Administrador</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label mb-1.5 block text-xs">Usuario</label>
                <input {...register('adminUsername')} placeholder="admin" className={SC} />
              </div>
              <div>
                <label className="form-label mb-1.5 block text-xs">Contraseña</label>
                <RhfPwd name="adminPassword" register={register} />
              </div>
            </div>
          </div>

          {/* ── Correos ── */}
          <div className="border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold">Correos electrónicos</span>
            </div>
            {/* Correo 1 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Correo 1</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block text-xs">Dirección</label>
                  <input {...register('email1')} type="email" placeholder="juan@empresa.com" className={SC} />
                </div>
                <div>
                  <label className="form-label mb-1.5 block text-xs">Contraseña</label>
                  <RhfPwd name="email1Password" register={register} />
                </div>
              </div>
            </div>
            {/* Correo 2 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Correo 2</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block text-xs">Dirección</label>
                  <input {...register('email2')} type="email" placeholder="juan.garcia@gmail.com" className={SC} />
                </div>
                <div>
                  <label className="form-label mb-1.5 block text-xs">Contraseña</label>
                  <RhfPwd name="email2Password" register={register} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Otras plataformas (solo empresa) ── */}
          {isCompany && (
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold">Otras plataformas</span>
                </div>
                <button
                  type="button"
                  onClick={addPlatform}
                  className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar plataforma
                </button>
              </div>

              {platforms.length === 0 ? (
                <div className="text-center py-4">
                  <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-muted-foreground">Sin plataformas registradas</p>
                  <button type="button" onClick={addPlatform}
                    className="mt-2 text-xs text-primary hover:underline">
                    + Agregar primera plataforma
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {platforms.map((p, i) => (
                    <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Plataforma {i + 1}</span>
                        <button type="button" onClick={() => removePlatform(i)}
                          className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors text-muted-foreground">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="form-label mb-1 block text-xs">Nombre *</label>
                          <input
                            value={p.name}
                            onChange={e => updatePlatform(i, 'name', e.target.value)}
                            placeholder="Ej: SAP, Office 365, SIIGO..."
                            className={SC}
                          />
                        </div>
                        <div>
                          <label className="form-label mb-1 block text-xs">Usuario</label>
                          <input
                            value={p.username}
                            onChange={e => updatePlatform(i, 'username', e.target.value)}
                            placeholder="usuario@plataforma.com"
                            className={SC}
                          />
                        </div>
                        <div>
                          <label className="form-label mb-1 block text-xs">Contraseña</label>
                          <PwdInput
                            value={p.password}
                            onChange={v => updatePlatform(i, 'password', v)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="form-label mb-1.5 block">Notas adicionales</label>
            <textarea {...register('notes')} rows={2}
              placeholder="Ej: Equipo asignado, extensión, piso..."
              className={`${SC} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Actualizar usuario' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
