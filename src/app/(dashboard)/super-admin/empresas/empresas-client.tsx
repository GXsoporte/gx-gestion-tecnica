'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { EmpresaModal } from './empresa-modal';
import {
  Building2, Plus, Search, Users, Ticket, CheckCircle2,
  XCircle, MoreHorizontal, Edit, Trash2, Power, Globe,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'bg-slate-100 text-slate-600 border-slate-200',
  BASIC: 'bg-blue-50 text-blue-700 border-blue-200',
  PROFESSIONAL: 'bg-purple-50 text-purple-700 border-purple-200',
  ENTERPRISE: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Trial',
  BASIC: 'Básico',
  PROFESSIONAL: 'Profesional',
  ENTERPRISE: 'Enterprise',
};

export function EmpresasClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['empresas', search, planFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await axios.get(`/api/empresas?${params}`);
      return data.data;
    },
  });

  const handleToggleActive = async (empresa: any) => {
    try {
      await axios.patch(`/api/empresas/${empresa.id}`, { isActive: !empresa.isActive });
      toast.success(`Empresa ${empresa.isActive ? 'desactivada' : 'activada'}`);
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    } catch {
      toast.error('Error al cambiar estado');
    }
    setOpenMenu(null);
  };

  const handleDelete = async (empresa: any) => {
    if (!confirm(`¿Eliminar "${empresa.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await axios.delete(`/api/empresas/${empresa.id}`);
      toast.success('Empresa eliminada');
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
    setOpenMenu(null);
  };

  const activeCount = companies.filter((c: any) => c.isActive).length;
  const totalUsers = companies.reduce((s: number, c: any) => s + (c._count?.users || 0), 0);
  const totalTickets = companies.reduce((s: number, c: any) => s + (c._count?.tickets || 0), 0);

  const columns = [
    {
      key: 'name',
      header: 'Empresa',
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">{row.name}</p>
            <p className="text-xs text-muted-foreground">@{row.slug} {row.nit && `· ${row.nit}`}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (row: any) => (
        <span className={cn('badge', PLAN_COLORS[row.plan] || PLAN_COLORS.BASIC)}>
          {PLAN_LABELS[row.plan] || row.plan}
        </span>
      ),
    },
    {
      key: 'users',
      header: 'Usuarios',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {row._count?.users || 0}
        </div>
      ),
    },
    {
      key: 'clients',
      header: 'Clientes',
      cell: (row: any) => (
        <span className="text-sm text-muted-foreground">{row._count?.clients || 0}</span>
      ),
    },
    {
      key: 'tickets',
      header: 'Tickets',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Ticket className="w-3.5 h-3.5" />
          {row._count?.tickets || 0}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      cell: (row: any) => (
        <span className={cn('badge', row.isActive
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-slate-100 text-slate-600 border-slate-200')}>
          {row.isActive ? (
            <><CheckCircle2 className="w-3 h-3 inline mr-1" />Activa</>
          ) : (
            <><XCircle className="w-3 h-3 inline mr-1" />Inactiva</>
          )}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creada',
      cell: (row: any) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        <div className="relative flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === row.id ? null : row.id); }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          {openMenu === row.id && (
            <div className="absolute right-0 top-8 z-10 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-premium py-1 w-44">
              <button
                onClick={() => { setEditEmpresa(row); setShowModal(true); setOpenMenu(null); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Edit className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => handleToggleActive(row)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                {row.isActive ? 'Desactivar' : 'Activar'}
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => handleDelete(row)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" onClick={() => setOpenMenu(null)}>
      <PageHeader
        title="Empresas"
        description="Gestión global de empresas en la plataforma GX Soporte"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Empresas' }]}
        actions={
          <button
            onClick={(e) => { e.stopPropagation(); setEditEmpresa(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva empresa
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total empresas', value: companies.length, icon: Building2, color: 'text-blue-600 bg-blue-100' },
          { label: 'Activas', value: activeCount, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
          { label: 'Total usuarios', value: totalUsers, icon: Users, color: 'text-purple-600 bg-purple-100' },
          { label: 'Total tickets', value: totalTickets, icon: Ticket, color: 'text-amber-600 bg-amber-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, NIT, slug..."
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos los planes</option>
          <option value="TRIAL">Trial</option>
          <option value="BASIC">Básico</option>
          <option value="PROFESSIONAL">Profesional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-1">
        <DataTable
          data={companies}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No hay empresas registradas"
        />
      </div>

      {showModal && (
        <EmpresaModal
          empresa={editEmpresa}
          onClose={() => { setShowModal(false); setEditEmpresa(null); }}
          onSuccess={() => {
            setShowModal(false);
            setEditEmpresa(null);
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
          }}
        />
      )}
    </div>
  );
}
