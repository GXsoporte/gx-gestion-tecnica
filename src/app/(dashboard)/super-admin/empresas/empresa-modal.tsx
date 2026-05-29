'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useRef, useState } from 'react';
import {
  X, Loader2, Building2, Upload, Trash2, ImageIcon,
  UserCog, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  // Empresa
  name:     z.string().min(2, 'Nombre requerido'),
  slug:     z.string().min(2, 'Subdominio requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  nit:      z.string().optional(),
  email:    z.string().email('Email inválido').optional().or(z.literal('')),
  phone:    z.string().optional(),
  address:  z.string().optional(),
  city:     z.string().optional(),
  country:  z.string().default('Colombia'),
  plan:     z.enum(['TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']),
  isActive: z.boolean(),
  // Admin user (opcional — solo aplica al crear)
  createAdmin:          z.boolean().default(false),
  adminName:            z.string().optional(),
  adminEmail:           z.string().optional(),
  adminPassword:        z.string().optional(),
  adminPasswordConfirm: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.createAdmin) return;
  if (!data.adminName || data.adminName.trim().length < 2) {
    ctx.addIssue({ code: 'custom', path: ['adminName'],  message: 'Nombre del administrador requerido' });
  }
  if (!data.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) {
    ctx.addIssue({ code: 'custom', path: ['adminEmail'], message: 'Email válido requerido' });
  }
  if (!data.adminPassword || data.adminPassword.length < 8) {
    ctx.addIssue({ code: 'custom', path: ['adminPassword'], message: 'Mínimo 8 caracteres' });
  }
  if (data.adminPassword !== data.adminPasswordConfirm) {
    ctx.addIssue({ code: 'custom', path: ['adminPasswordConfirm'], message: 'Las contraseñas no coinciden' });
  }
});

type FormData = z.infer<typeof schema>;

interface Props {
  empresa?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const PLAN_OPTIONS = [
  { value: 'TRIAL',        label: 'Trial (30 días)' },
  { value: 'BASIC',        label: 'Básico' },
  { value: 'PROFESSIONAL', label: 'Profesional' },
  { value: 'ENTERPRISE',   label: 'Enterprise' },
];

// ── Resize image → base64 PNG ─────────────────────────────────────────────────
function resizeImage(file: File, maxW = 500, maxH = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) { reject(new Error('La imagen no debe superar 5 MB')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        let w = img.width; let h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Strength indicator ────────────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Muy débil', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Débil',     color: 'bg-orange-400' };
  if (score === 3) return { score, label: 'Media',     color: 'bg-yellow-400' };
  if (score === 4) return { score, label: 'Fuerte',    color: 'bg-blue-500' };
  return { score, label: 'Muy fuerte', color: 'bg-green-500' };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function EmpresaModal({ empresa, onClose, onSuccess }: Props) {
  const [loading, setLoading]         = useState(false);
  const [logoBase64, setLogoBase64]   = useState<string | null>(empresa?.logo ?? null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const isEdit = !!empresa;

  const {
    register, handleSubmit, watch,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:     empresa?.name     || '',
      slug:     empresa?.slug     || '',
      nit:      empresa?.nit      || '',
      email:    empresa?.email    || '',
      phone:    empresa?.phone    || '',
      address:  empresa?.address  || '',
      city:     empresa?.city     || '',
      country:  empresa?.country  || 'Colombia',
      plan:     empresa?.plan     || 'BASIC',
      isActive: empresa?.isActive ?? true,
      createAdmin:          false,
      adminName:            '',
      adminEmail:           '',
      adminPassword:        '',
      adminPasswordConfirm: '',
    },
  });

  const nameValue    = watch('name');
  const createAdmin  = watch('createAdmin');
  const adminPassVal = watch('adminPassword') || '';
  const strength     = passwordStrength(adminPassVal);

  const handleNameBlur = () => {
    if (!isEdit && nameValue) {
      setValue('slug', nameValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  };

  // ── Logo helpers ──────────────────────────────────────────────────────────
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    setLogoLoading(true);
    try {
      setLogoBase64(await resizeImage(file));
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la imagen');
    } finally {
      setLogoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const payload: any = {
        name:     formData.name,
        slug:     formData.slug,
        nit:      formData.nit,
        email:    formData.email,
        phone:    formData.phone,
        address:  formData.address,
        city:     formData.city,
        country:  formData.country,
        plan:     formData.plan,
        isActive: formData.isActive,
        logo:     logoBase64,
      };

      if (!isEdit && formData.createAdmin) {
        payload.adminUser = {
          name:     formData.adminName,
          email:    formData.adminEmail,
          password: formData.adminPassword,
        };
      }

      if (isEdit) {
        await axios.patch(`/api/empresas/${empresa.id}`, payload);
        toast.success('Empresa actualizada correctamente');
      } else {
        await axios.post('/api/empresas', payload);
        toast.success('Empresa y usuario administrador creados correctamente');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{isEdit ? 'Editar empresa' : 'Nueva empresa'}</h2>
              <p className="text-xs text-muted-foreground">
                {isEdit ? empresa.name : 'Datos de la empresa y acceso inicial'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

          {/* ── SECCIÓN: Datos de la empresa ─────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Información de la empresa
            </h3>

            {/* Logo */}
            <div>
              <label className="form-label mb-2 block">Logo</label>
              <div className="flex items-start gap-4">
                <div className="w-36 h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center overflow-hidden bg-muted/20 flex-shrink-0">
                  {logoLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : logoBase64 ? (
                    <img src={logoBase64} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-7 h-7 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Sin logo</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Upload className="w-4 h-4" />
                    {logoBase64 ? 'Cambiar logo' : 'Subir logo'}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                  </label>
                  {logoBase64 && (
                    <button type="button" onClick={() => { setLogoBase64(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-medium transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />Eliminar logo
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG o WEBP · Máx. 5 MB<br />Aparece en el encabezado de los reportes PDF.</p>
                </div>
              </div>
            </div>

            {/* Nombre y Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">Nombre de la empresa *</label>
                <input {...register('name')} onBlur={handleNameBlur} placeholder="Ej: Empresa Demo S.A.S."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="form-label mb-1.5 block">Subdominio / Slug *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input {...register('slug')} disabled={isEdit} placeholder="empresa-demo"
                    className="w-full border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:cursor-not-allowed" />
                </div>
                {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
              </div>
            </div>

            {/* NIT y Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">NIT</label>
                <input {...register('nit')} placeholder="900.123.456-7"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Email corporativo</label>
                <input {...register('email')} type="email" placeholder="admin@empresa.com"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* Teléfono y Ciudad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">Teléfono</label>
                <input {...register('phone')} placeholder="+57 300 000 0000"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Ciudad</label>
                <input {...register('city')} placeholder="Bogotá"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="form-label mb-1.5 block">Dirección</label>
              <input {...register('address')} placeholder="Calle 72 #10-20"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>

            {/* Plan y Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label mb-1.5 block">Plan</label>
                <select {...register('plan')}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label mb-1.5 block">Estado</label>
                <select {...register('isActive', { setValueAs: (v) => v === 'true' || v === true })}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── SECCIÓN: Usuario administrador (solo en CREAR) ───────────── */}
          {!isEdit && (
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Toggle header */}
              <label className="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  {...register('createAdmin')}
                  className="w-4 h-4 rounded border-border accent-blue-600 cursor-pointer"
                />
                <div className="flex items-center gap-2 flex-1">
                  <UserCog className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold">Crear usuario administrador</span>
                </div>
                <span className="text-xs text-muted-foreground">Opcional</span>
              </label>

              {/* Campos del admin — se muestran cuando el toggle está activo */}
              {createAdmin && (
                <div className="p-5 space-y-4 border-t border-border bg-blue-50/30 dark:bg-blue-500/5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    Este usuario tendrá rol de <strong>Administrador</strong> y podrá gestionar toda la plataforma de la empresa.
                  </p>

                  {/* Nombre y Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label mb-1.5 block">Nombre completo *</label>
                      <input {...register('adminName')} placeholder="Ej: Juan Pérez"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      {errors.adminName && <p className="text-xs text-red-500 mt-1">{errors.adminName.message}</p>}
                    </div>
                    <div>
                      <label className="form-label mb-1.5 block">Email de acceso *</label>
                      <input {...register('adminEmail')} type="email" placeholder="juan@empresa.com"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      {errors.adminEmail && <p className="text-xs text-red-500 mt-1">{errors.adminEmail.message}</p>}
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label mb-1.5 block">Contraseña *</label>
                      <div className="relative">
                        <input
                          {...register('adminPassword')}
                          type={showPass ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Indicador de fortaleza */}
                      {adminPassVal && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i}
                                className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-muted'}`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{strength.label}</p>
                        </div>
                      )}
                      {errors.adminPassword && <p className="text-xs text-red-500 mt-1">{errors.adminPassword.message}</p>}
                    </div>
                    <div>
                      <label className="form-label mb-1.5 block">Confirmar contraseña *</label>
                      <div className="relative">
                        <input
                          {...register('adminPasswordConfirm')}
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Repite la contraseña"
                          className="w-full border border-border rounded-xl px-3 py-2.5 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.adminPasswordConfirm && (
                        <p className="text-xs text-red-500 mt-1">{errors.adminPasswordConfirm.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Botones ───────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || logoLoading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
