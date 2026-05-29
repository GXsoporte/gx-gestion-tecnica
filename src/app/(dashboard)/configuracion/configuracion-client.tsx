'use client';

import { useSession } from 'next-auth/react';
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import {
  Users, Shield, Building2, Settings, Plus, Loader2,
  Save, ExternalLink, Server, Code2, Database, KeyRound, Bot, Globe,
  Trash2, X,
} from 'lucide-react';
import { cn, USER_ROLE_LABELS, formatDate } from '@/lib/utils';
import { UserModal } from './user-modal';
import { useQueryClient } from '@tanstack/react-query';

export function ConfiguracionClient() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('usuarios');
  const [showUserModal, setShowUserModal] = useState(false);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/usuarios/${id}`);
      toast.success('Usuario eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  // Refs for empresa form fields
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);

  const handleSaveEmpresa = async () => {
    if (!session?.user?.companyId) return;
    setSavingEmpresa(true);
    try {
      await axios.patch(`/api/empresas/${session.user.companyId}`, {
        name: nameRef.current?.value,
        email: emailRef.current?.value,
        phone: phoneRef.current?.value,
        address: addressRef.current?.value,
        city: cityRef.current?.value,
      });
      toast.success('Información de empresa guardada correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSavingEmpresa(false);
    }
  };

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/usuarios');
      return data.data;
    },
    enabled: ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session?.user?.role || ''),
  });

  const tabs = [
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
    { id: 'sistema', label: 'Sistema', icon: Settings },
  ];

  const userColumns = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-700">{row.name?.[0] || 'U'}</span>
          </div>
          <div>
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      cell: (row: any) => (
        <span className={cn('badge', {
          'bg-purple-50 text-purple-700 border-purple-200': row.role === 'SUPER_ADMIN',
          'bg-blue-50 text-blue-700 border-blue-200': row.role === 'COMPANY_ADMIN',
          'bg-teal-50 text-teal-700 border-teal-200': row.role === 'COORDINATOR',
          'bg-green-50 text-green-700 border-green-200': row.role === 'TECHNICIAN',
          'bg-slate-100 text-slate-600 border-slate-200': row.role === 'CLIENT',
        })}>
          {USER_ROLE_LABELS[row.role] || row.role}
        </span>
      ),
    },
    {
      key: 'position',
      header: 'Cargo',
      cell: (row: any) => <span className="text-sm text-muted-foreground">{row.position || '—'}</span>,
    },
    {
      key: 'isActive',
      header: 'Estado',
      cell: (row: any) => (
        <span className={cn('badge', row.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>
          {row.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Último acceso',
      cell: (row: any) => (
        <span className="text-xs text-muted-foreground">{row.lastLogin ? formatDate(row.lastLogin) : 'Nunca'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => {
        if (row.id === session?.user?.id) return null;
        return confirmDeleteId === row.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDeleteUser(row.id)}
              disabled={deleting}
              className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded font-medium"
            >
              {deleting ? '...' : 'Confirmar'}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} className="p-0.5 hover:bg-muted rounded">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeleteId(row.id)}
            className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Gestión de usuarios, empresa y configuración del sistema"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Configuración' }]}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Nuevo usuario
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-1">
            <DataTable
              data={users}
              columns={userColumns}
              isLoading={usersLoading}
              emptyMessage="No hay usuarios registrados"
            />
          </div>
        </div>
      )}

      {activeTab === 'empresa' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card space-y-5">
          <h3 className="section-title">Información de la empresa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Nombre de la empresa</label>
              <input
                ref={nameRef}
                defaultValue={session?.user?.companyName || ''}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Subdominio</label>
              <input
                defaultValue={session?.user?.companySlug || ''}
                disabled
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Email corporativo</label>
              <input
                ref={emailRef}
                type="email"
                placeholder="admin@empresa.com"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Teléfono</label>
              <input
                ref={phoneRef}
                placeholder="+57 300 000 0000"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Ciudad</label>
              <input
                ref={cityRef}
                placeholder="Bogotá"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Dirección</label>
              <input
                ref={addressRef}
                placeholder="Calle 72 #10-20"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              onClick={handleSaveEmpresa}
              disabled={savingEmpresa}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingEmpresa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-8 shadow-card flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Configuración de Seguridad</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Gestiona los registros de auditoría, sesiones activas y ajustes de seguridad avanzados.
            </p>
          </div>
          <button
            onClick={() => router.push('/configuracion/seguridad')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ir a Seguridad
          </button>
        </div>
      )}

      {activeTab === 'sistema' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
          <h3 className="section-title mb-4">Información del sistema</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Versión', value: 'GX Soporte v1.0.0', icon: Code2 },
              { label: 'Framework', value: 'Next.js 14 + TypeScript', icon: Globe },
              { label: 'Base de datos', value: 'SQLite + Prisma ORM', icon: Database },
              { label: 'Autenticación', value: 'NextAuth.js JWT', icon: KeyRound },
              { label: 'IA integrada', value: 'OpenAI GPT-4o', icon: Bot },
              { label: 'Ambiente', value: 'development', icon: Server },
            ].map((info) => (
              <div key={info.label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                  <info.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                  <p className="text-sm font-medium font-mono">{info.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onSuccess={() => {
            setShowUserModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuario creado correctamente');
          }}
        />
      )}
    </div>
  );
}
