'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, Search, Eye, Clock, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import {
  cn,
  formatDate,
  formatMinutes,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/utils';
import { ActividadModal } from './actividad-modal';

export function ActividadesClient() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/actividades/${id}`);
      toast.success('Actividad eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await axios.get(`/api/actividades?${params}`);
      return data.data;
    },
  });

  const columns = [
    {
      key: 'activityNumber',
      header: 'ID',
      cell: (row: any) => (
        <span className="font-mono text-xs text-blue-600 font-semibold">{row.activityNumber}</span>
      ),
    },
    {
      key: 'description',
      header: 'Descripción',
      cell: (row: any) => (
        <div className="max-w-[280px]">
          <p className="text-sm font-medium truncate">{row.description}</p>
          {row.ticket && (
            <p className="text-xs text-muted-foreground">Ticket: {row.ticket.ticketNumber}</p>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      cell: (row: any) => <span className="text-sm">{row.client?.companyName || '—'}</span>,
    },
    {
      key: 'technician',
      header: 'Técnico',
      cell: (row: any) => <span className="text-sm">{row.technician?.name || '—'}</span>,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      cell: (row: any) => (
        <span className={cn('badge', PRIORITY_COLORS[row.priority])}>
          {PRIORITY_LABELS[row.priority]}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row: any) => (
        <span className={cn('badge', ACTIVITY_STATUS_COLORS[row.status])}>
          {ACTIVITY_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'totalMinutes',
      header: 'Tiempo',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {formatMinutes(row.totalMinutes)}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      cell: (row: any) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Link href={`/actividades/${row.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
            <Eye className="w-3.5 h-3.5" />
            Ver
          </Link>
          {confirmDeleteId === row.id ? (
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
          )}
        </div>
      ),
    },
  ];

  const stats = {
    total: activities.length,
    pending: activities.filter((a: any) => a.status === 'PENDING').length,
    inProgress: activities.filter((a: any) => a.status === 'IN_PROGRESS').length,
    completed: activities.filter((a: any) => a.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividades Técnicas"
        description="Registro y seguimiento de todas las actividades de soporte técnico"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Actividades' }]}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Actividad
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Pendientes', value: stats.pending, color: 'text-yellow-600' },
          { label: 'En proceso', value: stats.inProgress, color: 'text-blue-600' },
          { label: 'Completadas', value: stats.completed, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por ID, descripción..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ACTIVITY_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-1">
        <DataTable
          data={activities}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No hay actividades registradas"
          pageSize={15}
        />
      </div>

      {showModal && (
        <ActividadModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            toast.success('Actividad registrada correctamente');
          }}
        />
      )}
    </div>
  );
}
