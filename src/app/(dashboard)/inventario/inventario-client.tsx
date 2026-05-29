'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Monitor,
  Eye,
  Laptop,
  Server,
  Printer,
  Wifi,
  HardDrive,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import {
  cn,
  formatDate,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  ASSET_TYPE_LABELS,
} from '@/lib/utils';
import { AssetModal } from './asset-modal';

const TYPE_ICONS: Record<string, React.ElementType> = {
  DESKTOP: Monitor,
  LAPTOP: Laptop,
  SERVER: Server,
  PRINTER: Printer,
  NETWORK_DEVICE: Wifi,
  OTHER: HardDrive,
};

export function InventarioClient() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';
  const canEdit   = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR', 'TECHNICIAN'].includes(role);
  const canDelete = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);

  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', clientId: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/inventario/${id}`);
      toast.success('Activo eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const { data } = await axios.get(`/api/inventario?${params}`);
      return data.data;
    },
  });

  const statuses = {
    total: assets.length,
    active: assets.filter((a: any) => a.status === 'ACTIVE').length,
    maintenance: assets.filter((a: any) => a.status === 'MAINTENANCE').length,
    damaged: assets.filter((a: any) => a.status === 'DAMAGED').length,
  };

  const columns = [
    {
      key: 'assetNumber',
      header: 'ID Activo',
      cell: (row: any) => (
        <span className="font-mono text-xs text-blue-600 font-semibold">{row.assetNumber}</span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row: any) => {
        const Icon = TYPE_ICONS[row.type] || Monitor;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{ASSET_TYPE_LABELS[row.type]}</span>
          </div>
        );
      },
    },
    {
      key: 'device',
      header: 'Equipo',
      cell: (row: any) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.brand} {row.model}</p>
          {row.serial && <p className="text-xs text-muted-foreground font-mono">{row.serial}</p>}
        </div>
      ),
    },
    {
      key: 'assignedUser',
      header: 'Asignado a',
      cell: (row: any) => (
        <div>
          <p className="text-sm text-foreground">{row.assignedUser || '—'}</p>
          {row.area && <p className="text-xs text-muted-foreground">{row.area}</p>}
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      cell: (row: any) => <span className="text-sm">{row.client?.companyName || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row: any) => (
        <span className={cn('badge', ASSET_STATUS_COLORS[row.status])}>
          {ASSET_STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      key: 'warrantyExpiry',
      header: 'Garantía',
      cell: (row: any) => {
        if (!row.warrantyExpiry) return <span className="text-xs text-muted-foreground">—</span>;
        const expired = new Date(row.warrantyExpiry) < new Date();
        return (
          <span className={cn('text-xs', expired ? 'text-red-600' : 'text-muted-foreground')}>
            {formatDate(row.warrantyExpiry)}
            {expired && ' (Expirada)'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (row: any) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/inventario/${row.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium px-1.5 py-1"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver
          </Link>
          {canEdit && (
            <button
              onClick={() => { setSelectedAsset(row); setShowModal(true); }}
              className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors text-muted-foreground"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
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
                className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors text-muted-foreground"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario de Activos"
        description="Hoja de vida y control de todos los equipos tecnológicos"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventario' }]}
        actions={
          canEdit ? (
            <button
              onClick={() => { setSelectedAsset(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Activo
            </button>
          ) : undefined
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total activos', value: statuses.total, color: 'text-foreground' },
          { label: 'Activos', value: statuses.active, color: 'text-green-600' },
          { label: 'En mantenimiento', value: statuses.maintenance, color: 'text-yellow-600' },
          { label: 'Dañados', value: statuses.damaged, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por ID, marca, modelo, serial..."
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
            {Object.entries(ASSET_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card p-1">
        <DataTable
          data={assets}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No hay activos registrados"
          pageSize={15}
        />
      </div>

      {showModal && (
        <AssetModal
          asset={selectedAsset}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            toast.success('Activo guardado correctamente');
          }}
        />
      )}
    </div>
  );
}
