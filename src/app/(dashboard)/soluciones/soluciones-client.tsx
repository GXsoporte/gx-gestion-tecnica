'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Wrench, Plus, Search, CheckCircle2, Clock,
  Truck, AlertCircle, ChevronDown, Trash2,
} from 'lucide-react';
import { SolucionModal } from './solucion-modal';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DELIVERY_LABELS: Record<string, string> = {
  PENDING: 'Pendiente entrega',
  DELIVERED: 'Entregado',
};

const DELIVERY_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SolucionesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const role = session?.user?.role ?? '';
  const canCreate = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'].includes(role);
  const canDelete = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COORDINATOR'].includes(role);

  const { data: solutions = [], isLoading } = useQuery({
    queryKey: ['solutions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const { data } = await axios.get(`/api/soluciones?${params}`);
      return data.data || [];
    },
  });

  const filtered = search
    ? solutions.filter((s: any) =>
        s.solutionNumber?.toLowerCase().includes(search.toLowerCase()) ||
        s.ticket?.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
        s.client?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        s.asset?.brand?.toLowerCase().includes(search.toLowerCase())
      )
    : solutions;

  const handleStatusChange = async (id: string, field: 'status' | 'deliveryStatus', value: string) => {
    try {
      await axios.patch(`/api/soluciones/${id}`, { [field]: value });
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['solutions'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`¿Eliminar la solución ${num}? Esta acción no se puede deshacer.`)) return;
    try {
      await axios.delete(`/api/soluciones/${id}`);
      toast.success(`Solución ${num} eliminada`);
      qc.invalidateQueries({ queryKey: ['solutions'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const totals = {
    inProgress: solutions.filter((s: any) => s.status === 'IN_PROGRESS').length,
    completed: solutions.filter((s: any) => s.status === 'COMPLETED').length,
    pending: solutions.filter((s: any) => s.deliveryStatus === 'PENDING' && s.status === 'COMPLETED').length,
    delivered: solutions.filter((s: any) => s.deliveryStatus === 'DELIVERED').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Soluciones
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reparaciones y soluciones técnicas</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Nueva Solución
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'En proceso', value: totals.inProgress, icon: Clock, color: 'text-blue-500' },
          { label: 'Completadas', value: totals.completed, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Por entregar', value: totals.pending, icon: AlertCircle, color: 'text-amber-500' },
          { label: 'Entregadas', value: totals.delivered, icon: Truck, color: 'text-purple-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, ticket, cliente, equipo..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none"
        >
          <option value="ALL">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay soluciones registradas</p>
            {canCreate && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Para crear una solución, primero debe existir un diagnóstico aprobado
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-8" />
                  {['Número', 'Ticket', 'Cliente', 'Equipo', 'Técnico', 'Fecha inicio', 'Estado', 'Entrega', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <>
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      {/* Expand toggle */}
                      <td className="pl-3">
                        <button
                          onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedRow === s.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-primary">{s.solutionNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{s.ticket?.ticketNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{s.client?.companyName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{s.asset?.brand} {s.asset?.model}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{s.technician?.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{fmtDate(s.startDate || s.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[s.status]}`}>
                          {STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DELIVERY_STYLES[s.deliveryStatus]}`}>
                          {DELIVERY_LABELS[s.deliveryStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {canCreate && s.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleStatusChange(s.id, 'status', 'COMPLETED')}
                              title="Marcar como completada"
                              className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Completar
                            </button>
                          )}
                          {canCreate && s.status === 'COMPLETED' && s.deliveryStatus === 'PENDING' && (
                            <button
                              onClick={() => handleStatusChange(s.id, 'deliveryStatus', 'DELIVERED')}
                              title="Marcar como entregada"
                              className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" /> Entregar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(s.id, s.solutionNumber)}
                              title="Eliminar solución"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expandedRow === s.id && (
                      <tr key={`${s.id}-detail`} className="bg-muted/10 border-b border-border/50">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {[
                              { label: 'Actividades realizadas', value: s.activitiesDone },
                              { label: 'Repuestos utilizados', value: s.spareParts },
                              { label: 'Software instalado', value: s.installedSoftware },
                              { label: 'Configuraciones', value: s.configurations },
                              { label: 'Pruebas realizadas', value: s.testsDone },
                              { label: 'Resultado final', value: s.finalResult },
                              { label: 'Recomendaciones', value: s.recommendations },
                            ].map(({ label, value }) =>
                              value ? (
                                <div key={label}>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                                  <p className="text-sm text-foreground">{value}</p>
                                </div>
                              ) : null
                            )}
                            {!s.activitiesDone && !s.spareParts && !s.finalResult && (
                              <p className="text-xs text-muted-foreground col-span-3 italic">Sin detalles registrados aún</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <SolucionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ['solutions'] });
            toast.success('Solución creada');
          }}
        />
      )}
    </div>
  );
}
