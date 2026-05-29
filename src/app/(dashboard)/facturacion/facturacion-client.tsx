'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Receipt,
  Plus,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { FacturaModal } from './factura-modal';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

function fmt(n: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export function FacturacionClient() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'COMPANY_ADMIN';

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const { data } = await axios.get(`/api/facturacion?${params}`);
      return data.data;
    },
  });

  const totalFacturado = invoices.reduce((s: number, i: any) => s + i.total, 0);
  const porCobrar = invoices.filter((i: any) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s: number, i: any) => s + i.total, 0);
  const pagado = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.total, 0);
  const vencidas = invoices.filter((i: any) => i.status === 'OVERDUE').length;

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`¿Eliminar la factura ${num}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/facturacion/${id}`);
      toast.success('Factura eliminada');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/facturacion/${id}`, { status });
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setShowModal(false);
    setEditInvoice(null);
    toast.success(editInvoice ? 'Factura actualizada' : 'Factura creada');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Facturación
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de facturas de tu empresa
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditInvoice(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Factura
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total facturado</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(totalFacturado)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por cobrar</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(porCobrar)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Enviadas + Vencidas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagado</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(pagado)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoices.filter((i: any) => i.status === 'PAID').length} factura{invoices.filter((i: any) => i.status === 'PAID').length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencidas</span>
          </div>
          <p className="text-xl font-bold text-foreground">{vencidas}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Requieren atención</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'Todos los estados' : STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No hay facturas</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {isAdmin ? 'Crea la primera factura con el botón de arriba' : 'No se han registrado facturas aún'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emisión</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vencimiento</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-primary">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{invoice.client?.companyName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.client?.contactName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(invoice.issueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${invoice.status === 'OVERDUE' ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {fmtDate(invoice.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-foreground">{fmt(invoice.total, invoice.currency)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="relative inline-block">
                          <select
                            value={invoice.status}
                            onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 ${STATUS_STYLES[invoice.status]}`}
                          >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                        </div>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[invoice.status]}`}>
                          {STATUS_LABELS[invoice.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/api/facturacion/${invoice.id}/reporte`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Ver / Imprimir factura"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                            disabled={deletingId === invoice.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                            title="Eliminar factura"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <FacturaModal
          invoice={editInvoice}
          onClose={() => { setShowModal(false); setEditInvoice(null); }}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
