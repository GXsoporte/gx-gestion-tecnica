'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Wrench, Calendar, Clock, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { cn, formatDate, MAINTENANCE_TYPE_LABELS, MAINTENANCE_STATUS_LABELS } from '@/lib/utils';
import { MantenimientoModal } from './mantenimiento-modal';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
};

const TYPE_COLORS: Record<string, string> = {
  PREVENTIVE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  CORRECTIVE: 'bg-orange-50 text-orange-700 border-orange-200',
  PREDICTIVE: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function MantenimientosClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/mantenimientos/${id}`);
      toast.success('Mantenimiento eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ['maintenances', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await axios.get(`/api/mantenimientos?${params}`);
      return data.data;
    },
  });

  const columns = [
    {
      key: 'title',
      header: 'Mantenimiento',
      cell: (row: any) => (
        <div>
          <p className="text-sm font-medium">{row.title}</p>
          {row.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row: any) => (
        <span className={cn('badge', TYPE_COLORS[row.type])}>
          {MAINTENANCE_TYPE_LABELS[row.type]}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      cell: (row: any) => <span className="text-sm">{row.client?.companyName || '—'}</span>,
    },
    {
      key: 'asset',
      header: 'Equipo',
      cell: (row: any) =>
        row.asset ? (
          <span className="text-sm">{row.asset.brand} {row.asset.model}</span>
        ) : (
          <span className="text-xs text-muted-foreground">General</span>
        ),
    },
    {
      key: 'technician',
      header: 'Técnico',
      cell: (row: any) => <span className="text-sm">{row.technician?.name || '—'}</span>,
    },
    {
      key: 'scheduledDate',
      header: 'Fecha programada',
      cell: (row: any) => {
        const isOverdue = new Date(row.scheduledDate) < new Date() && row.status === 'SCHEDULED';
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className={cn('w-3.5 h-3.5', isOverdue ? 'text-red-500' : 'text-muted-foreground')} />
            <span className={cn('text-sm', isOverdue ? 'text-red-600 font-medium' : '')}>
              {formatDate(row.scheduledDate)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row: any) => (
        <span className={cn('badge', STATUS_COLORS[row.status])}>
          {MAINTENANCE_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        confirmDeleteId === row.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDelete(row.id)}
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
        )
      ),
    },
  ];

  const stats = {
    total: maintenances.length,
    scheduled: maintenances.filter((m: any) => m.status === 'SCHEDULED').length,
    completed: maintenances.filter((m: any) => m.status === 'COMPLETED').length,
    overdue: maintenances.filter((m: any) => new Date(m.scheduledDate) < new Date() && m.status === 'SCHEDULED').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mantenimientos"
        description="Gestión de mantenimientos preventivos y correctivos"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Mantenimientos' }]}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Programar Mantenimiento
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', icon: Wrench },
          { label: 'Programados', value: stats.scheduled, color: 'text-blue-600', icon: Calendar },
          { label: 'Completados', value: stats.completed, color: 'text-green-600', icon: Wrench },
          { label: 'Vencidos', value: stats.overdue, color: 'text-red-600', icon: Clock },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(MAINTENANCE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-1">
        <DataTable
          data={maintenances}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No hay mantenimientos registrados"
          pageSize={15}
          onRowClick={(row) => router.push(`/mantenimientos/${row.id}`)}
        />
      </div>

      {showModal && (
        <MantenimientoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['maintenances'] });
            toast.success('Mantenimiento programado correctamente');
          }}
        />
      )}
    </div>
  );
}
