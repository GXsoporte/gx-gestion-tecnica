'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  TicketIcon,
  Eye,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import {
  cn,
  formatDate,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
} from '@/lib/utils';
import { TicketModal } from './ticket-modal';

export function TicketsClient() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    type: '',
  });

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/tickets/${id}`);
      toast.success('Ticket eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.type) params.set('type', filters.type);
      const { data } = await axios.get(`/api/tickets?${params}`);
      return data.data;
    },
  });

  const columns = [
    {
      key: 'ticketNumber',
      header: 'ID',
      cell: (row: any) => (
        <span className="font-mono text-xs text-blue-600 font-semibold">{row.ticketNumber}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Asunto',
      cell: (row: any) => (
        <div className="max-w-[300px]">
          <p className="text-sm font-medium text-foreground truncate">{row.subject}</p>
          <p className="text-xs text-muted-foreground truncate">{row.requesterName}</p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      cell: (row: any) => (
        <span className="text-sm text-foreground">{row.client?.companyName || '—'}</span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row: any) => (
        <span className="text-xs text-muted-foreground">
          {TICKET_TYPE_LABELS[row.type] || row.type}
        </span>
      ),
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
        <span className={cn('badge', TICKET_STATUS_COLORS[row.status])}>
          {TICKET_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Técnico',
      cell: (row: any) => (
        <span className="text-sm text-foreground">{row.assignedTo?.name || 'Sin asignar'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      cell: (row: any) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/tickets/${row.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
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

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter((t: any) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
    critical: tickets.filter((t: any) => t.priority === 'CRITICAL').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets de Soporte"
        description="Gestión centralizada de solicitudes de soporte técnico"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tickets' }]}
        actions={
          <button
            onClick={() => { setSelectedTicket(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Ticket
          </button>
        }
      />

      {/* Contadores rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: statusCounts.all, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'Abiertos', value: statusCounts.open, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'En proceso', value: statusCounts.inProgress, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
          { label: 'Críticos', value: statusCounts.critical, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl p-4 border border-border', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por ID, asunto, solicitante..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Todos los estados</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ search: '', status: '', priority: '', type: '' })}
            className="flex items-center justify-center gap-2 border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden p-1">
        <DataTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No se encontraron tickets"
          pageSize={15}
        />
      </div>

      {showModal && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            toast.success('Ticket guardado correctamente');
          }}
        />
      )}
    </div>
  );
}
