'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { cn, formatDate, getInitials, USER_ROLE_LABELS } from '@/lib/utils';
import {
  User, Mail, Phone, Briefcase, Building2, Shield,
  Clock, Ticket, ClipboardList, Wrench, Save, Eye, EyeOff,
  Loader2, Calendar, CheckCircle2, AlertCircle, Lock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PerfilData {
  id: string; name: string; email: string;
  phone?: string | null; position?: string | null; department?: string | null;
  role: string; isActive: boolean; image?: string | null;
  lastLogin?: string | null; createdAt: string;
  company?: { id: string; name: string; slug: string; logo?: string | null; plan: string } | null;
  stats: {
    assignedTickets: number; createdTickets: number;
    activities: number; createdActivities: number;
    maintenances: number; totalMinutes: number; totalHours: number;
  };
}

const PLAN_LABELS: Record<string, string> = {
  TRIAL:        'Trial',
  BASIC:        'Básico',
  PROFESSIONAL: 'Profesional',
  ENTERPRISE:   'Enterprise',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:   'bg-purple-50 text-purple-700 border-purple-200',
  COMPANY_ADMIN: 'bg-blue-50 text-blue-700 border-blue-200',
  TECHNICIAN:    'bg-green-50 text-green-700 border-green-200',
  CLIENT:        'bg-slate-100 text-slate-600 border-slate-200',
};

export function PerfilClient() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name,       setName]       = useState('');
  const [phone,      setPhone]      = useState('');
  const [position,   setPosition]   = useState('');
  const [department, setDepartment] = useState('');
  const [saving,     setSaving]     = useState(false);

  // ── Password state ───────────────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw,   setSavingPw]   = useState(false);

  // ── Profile data ─────────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery<PerfilData>({
    queryKey: ['perfil'],
    queryFn: async () => {
      const { data } = await axios.get('/api/perfil');
      return data.data as PerfilData;
    },
  });

  // Sync form fields when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setPosition(profile.position ?? '');
      setDepartment(profile.department ?? '');
    }
  }, [profile]);

  // ── Save personal info ────────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      await axios.patch('/api/perfil', { name, phone, position, department });
      await updateSession({ name });
      queryClient.invalidateQueries({ queryKey: ['perfil'] });
      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPw) return toast.error('Ingresa tu contraseña actual');
    if (!newPw)     return toast.error('Ingresa la nueva contraseña');
    if (newPw.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres');
    if (newPw !== confirmPw) return toast.error('Las contraseñas no coinciden');

    setSavingPw(true);
    try {
      await axios.patch('/api/perfil', {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      toast.success('Contraseña actualizada correctamente');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setSavingPw(false);
    }
  };

  // ── Password strength ─────────────────────────────────────────────────────────
  const pwStrength = (pw: string) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const labels = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
    const colors  = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];
    return { score, label: labels[score], color: colors[score] };
  };
  const strength = pwStrength(newPw);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = getInitials(profile.name);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        description="Gestiona tu información personal y configuración de cuenta"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mi Perfil' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna izquierda: tarjeta de identidad ─────────────────────── */}
        <div className="space-y-4">
          {/* Avatar + datos clave */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                {profile.image ? (
                  <img src={profile.image} alt={profile.name} className="w-24 h-24 rounded-2xl object-cover" />
                ) : (
                  <span className="text-white text-3xl font-bold">{initials}</span>
                )}
              </div>
              <span className={cn(
                'absolute -bottom-2 -right-2 w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center',
                profile.isActive ? 'bg-green-500' : 'bg-slate-400'
              )}>
                {profile.isActive
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  : <AlertCircle   className="w-3.5 h-3.5 text-white" />}
              </span>
            </div>

            <h2 className="text-lg font-bold text-foreground">{profile.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
            {profile.position && (
              <p className="text-xs text-muted-foreground mt-1">{profile.position}</p>
            )}

            <span className={cn('badge mt-3', ROLE_COLORS[profile.role] || ROLE_COLORS.CLIENT)}>
              <Shield className="w-3 h-3 mr-1 inline" />
              {USER_ROLE_LABELS[profile.role] || profile.role}
            </span>

            {/* Empresa */}
            {profile.company && (
              <div className="w-full mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {profile.company.logo ? (
                      <img src={profile.company.logo} alt={profile.company.name} className="w-8 h-8 object-contain rounded" />
                    ) : (
                      <Building2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{profile.company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Plan {PLAN_LABELS[profile.company.plan] || profile.company.plan}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="w-full mt-4 pt-4 border-t border-border space-y-2">
              {profile.lastLogin && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Último acceso: {formatDate(profile.lastLogin)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Miembro desde: {formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-5">
            <h3 className="text-sm font-semibold mb-4">Actividad</h3>
            <div className="space-y-3">
              {[
                { icon: Ticket,       label: 'Tickets asignados',   value: profile.stats.assignedTickets },
                { icon: Ticket,       label: 'Tickets creados',      value: profile.stats.createdTickets },
                { icon: ClipboardList,label: 'Actividades técnicas', value: profile.stats.activities },
                { icon: Wrench,       label: 'Mantenimientos',       value: profile.stats.maintenances },
                { icon: Clock,        label: 'Horas trabajadas',     value: `${profile.stats.totalHours} h` },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <stat.icon className="w-3.5 h-3.5" />
                    {stat.label}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Columna derecha: formularios ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información personal */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold">Información personal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="sm:col-span-2">
                <label className="form-label mb-1.5 block">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-muted cursor-not-allowed text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">El correo no puede modificarse desde aquí</p>
              </div>

              {/* Teléfono */}
              <div>
                <label className="form-label mb-1.5 block">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Cargo */}
              <div>
                <label className="form-label mb-1.5 block">Cargo</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Ej. Técnico de soporte"
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Departamento */}
              <div>
                <label className="form-label mb-1.5 block">Departamento</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ej. Tecnología"
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Rol (read-only) */}
              <div>
                <label className="form-label mb-1.5 block">Rol en el sistema</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={USER_ROLE_LABELS[profile.role] || profile.role}
                    disabled
                    className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-muted cursor-not-allowed text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-border">
              <button
                onClick={handleSaveInfo}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </div>

          {/* Cambiar contraseña */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-orange-50 dark:bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Seguridad — Cambiar contraseña</h3>
                <p className="text-xs text-muted-foreground">Usa una contraseña segura con mayúsculas, números y símbolos</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Contraseña actual */}
              <div>
                <label className="form-label mb-1.5 block">Contraseña actual</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="form-label mb-1.5 block">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Indicador de fortaleza */}
                {newPw && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-all',
                            n <= strength.score ? strength.color : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn('text-xs font-medium', {
                      'text-red-500':    strength.score <= 1,
                      'text-orange-500': strength.score === 2,
                      'text-yellow-500': strength.score === 3,
                      'text-blue-500':   strength.score === 4,
                      'text-green-500':  strength.score === 5,
                    })}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="form-label mb-1.5 block">Confirmar nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className={cn(
                      'w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      confirmPw && newPw !== confirmPw
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-border'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-border">
              <button
                onClick={handleChangePassword}
                disabled={savingPw || !currentPw || !newPw || newPw !== confirmPw}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Cambiar contraseña
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
