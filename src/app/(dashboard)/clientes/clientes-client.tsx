'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit2,
  MoreVertical,
  Ticket,
  ClipboardList,
  Monitor,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { cn, formatDate } from '@/lib/utils';
import { ClientModal } from './client-modal';

export function ClientesClient() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/clientes/${id}`);
      toast.success('Cliente eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await axios.get(`/api/clientes?${params}`);
      return data.data;
    },
  });

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700 border-green-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    SUSPENDED: 'Suspendido',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gestión de clientes y empresas atendidas"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clientes' }]}
        actions={
          <button
            onClick={() => { setSelectedClient(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        }
      />

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por empresa, NIT, contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="SUSPENDED">Suspendidos</option>
          </select>
        </div>
      </div>

      {/* Conteo */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {clients.length} clientes encontrados
        </p>
      </div>

      {/* Grid de clientes */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6">
              <div className="space-y-3">
                <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">No se encontraron clientes</p>
          <p className="text-sm mt-1">Crea el primer cliente para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client: any) => (
            <div
              key={client.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate max-w-[160px]">
                      {client.companyName}
                    </p>
                    {client.nit && (
                      <p className="text-xs text-muted-foreground">NIT: {client.nit}</p>
                    )}
                  </div>
                </div>
                <span className={cn('badge flex-shrink-0', statusColors[client.status])}>
                  {statusLabels[client.status]}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground truncate">{client.contactName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${client.email}`} className="text-primary hover:underline truncate">
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{client.phone}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{client.city}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 py-3 border-t border-border mb-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>{client._count?.tickets || 0} tickets</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>{client._count?.activities || 0} actividades</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{client._count?.assets || 0} activos</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/clientes/${client.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-border rounded-lg py-2 hover:bg-muted transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver detalle
                </Link>
                <button
                  onClick={() => { setSelectedClient(client); setShowModal(true); }}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {confirmDeleteId === client.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(client.id)}
                      disabled={deleting}
                      className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded font-medium"
                    >
                      {deleting ? '...' : 'Confirmar'}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="p-1 hover:bg-muted rounded border border-border">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(client.id)}
                    className="flex items-center justify-center border border-border rounded-lg px-3 py-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-muted-foreground"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal
          client={selectedClient}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast.success('Cliente guardado correctamente');
          }}
        />
      )}
    </div>
  );
}
