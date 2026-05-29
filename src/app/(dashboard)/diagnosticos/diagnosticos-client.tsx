'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { Stethoscope, Plus, Search, CheckCircle2, XCircle, Clock, Send, FileText } from 'lucide-react';
import { DiagnosticoModal } from './diagnostico-modal';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  INFO_REQUESTED: 'Más info',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  INFO_REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DiagnosticosClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const canCreate = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'].includes(session?.user?.role ?? '');

  const { data: diagnoses = [], isLoading } = useQuery({
    queryKey: ['diagnoses', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const { data } = await axios.get(`/api/diagnosticos?${params}`);
      return data.data;
    },
  });

  const filtered = search
    ? diagnoses.filter((d: any) =>
        d.diagnosisNumber?.toLowerCase().includes(search.toLowerCase()) ||
        d.ticket?.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
        d.client?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        d.asset?.brand?.toLowerCase().includes(search.toLowerCase())
      )
    : diagnoses;

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await axios.patch(`/api/diagnosticos/${id}`, { status });
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['diagnoses'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  const totals = {
    draft: diagnoses.filter((d: any) => d.status === 'DRAFT').length,
    sent: diagnoses.filter((d: any) => d.status === 'SENT').length,
    approved: diagnoses.filter((d: any) => d.status === 'APPROVED').length,
    rejected: diagnoses.filter((d: any) => d.status === 'REJECTED').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Diagnósticos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Diagnósticos técnicos de equipos</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Nuevo Diagnóstico
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Borrador', value: totals.draft, icon: FileText, color: 'text-gray-500' },
          { label: 'Enviados', value: totals.sent, icon: Send, color: 'text-blue-500' },
          { label: 'Aprobados', value: totals.approved, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Rechazados', value: totals.rejected, icon: XCircle, color: 'text-red-500' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número, ticket, cliente..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none">
          <option value="ALL">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay diagnósticos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Número', 'Ticket', 'Cliente', 'Equipo', 'Técnico', 'Fecha', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3"><span className="text-sm font-mono font-semibold text-primary">{d.diagnosisNumber}</span></td>
                    <td className="px-4 py-3"><span className="text-xs font-mono text-muted-foreground">{d.ticket?.ticketNumber}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-foreground">{d.client?.companyName}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{d.asset?.brand} {d.asset?.model}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-foreground">{d.technician?.name}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[d.status]}`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {d.status === 'DRAFT' && canCreate && (
                          <button onClick={() => handleStatusChange(d.id, 'SENT')} title="Enviar al cliente"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-medium">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {d.status === 'SENT' && session?.user?.role === 'CLIENT' && (
                          <>
                            <button onClick={() => handleStatusChange(d.id, 'APPROVED')}
                              className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aprobar
                            </button>
                            <button onClick={() => handleStatusChange(d.id, 'REJECTED')}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rechazar
                            </button>
                          </>
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
        <DiagnosticoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ['diagnoses'] });
            toast.success('Diagnóstico creado');
          }}
        />
      )}
    </div>
  );
}
