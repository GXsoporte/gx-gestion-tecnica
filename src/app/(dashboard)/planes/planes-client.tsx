'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CreditCard, Plus, Pencil, Trash2, X, Loader2,
  Check, Users, Building2, Ticket, Database,
} from 'lucide-react';

const FLAG_LABELS: { key: string; label: string }[] = [
  { key: 'hasInventory', label: 'Inventario' },
  { key: 'hasTickets', label: 'Tickets' },
  { key: 'hasActivities', label: 'Actividades' },
  { key: 'hasManualDiagnosis', label: 'Diagnóstico manual' },
  { key: 'hasAIDiagnosis', label: 'Diagnóstico IA' },
  { key: 'hasInvoicing', label: 'Facturación' },
  { key: 'hasServices', label: 'Catálogo servicios' },
  { key: 'hasDocuments', label: 'Documentos' },
  { key: 'hasAdvancedKPIs', label: 'KPIs avanzados' },
  { key: 'hasPDFExport', label: 'Exportar PDF' },
  { key: 'hasAutoEmails', label: 'Emails automáticos' },
  { key: 'hasBrandCustom', label: 'Marca personalizada' },
  { key: 'hasAuditLog', label: 'Auditoría' },
  { key: 'hasMaintenances', label: 'Mantenimientos' },
  { key: 'hasCoordinator', label: 'Rol Coordinador' },
];

const PLAN_COLORS: Record<string, string> = {
  DEMO: 'from-gray-500 to-gray-600',
  BASIC: 'from-blue-500 to-blue-600',
  PROFESSIONAL: 'from-purple-500 to-purple-600',
  ENTERPRISE: 'from-amber-500 to-amber-600',
};

interface PlanForm {
  code: string;
  name: string;
  price: number;
  maxUsers: number;
  maxClients: number;
  maxTickets: string;
  maxStorageGb: number;
  durationDays: string;
  hasInventory: boolean;
  hasTickets: boolean;
  hasActivities: boolean;
  hasManualDiagnosis: boolean;
  hasAIDiagnosis: boolean;
  hasInvoicing: boolean;
  hasServices: boolean;
  hasDocuments: boolean;
  hasAdvancedKPIs: boolean;
  hasPDFExport: boolean;
  hasAutoEmails: boolean;
  hasBrandCustom: boolean;
  hasAuditLog: boolean;
  hasMaintenances: boolean;
  hasCoordinator: boolean;
}

const defaultForm = (): PlanForm => ({
  code: '',
  name: '',
  price: 0,
  maxUsers: 3,
  maxClients: 10,
  maxTickets: '',
  maxStorageGb: 1,
  durationDays: '',
  hasInventory: true,
  hasTickets: true,
  hasActivities: true,
  hasManualDiagnosis: true,
  hasAIDiagnosis: false,
  hasInvoicing: false,
  hasServices: false,
  hasDocuments: false,
  hasAdvancedKPIs: false,
  hasPDFExport: true,
  hasAutoEmails: false,
  hasBrandCustom: false,
  hasAuditLog: false,
  hasMaintenances: false,
  hasCoordinator: false,
});

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

export function PlanesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(defaultForm());
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data } = await axios.get('/api/planes');
      return data.data || [];
    },
  });

  // Guarda de rol DESPUÉS de todos los hooks
  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Acceso restringido al Super Administrador</p>
      </div>
    );
  }

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const openEdit = (plan: any) => {
    setEditingId(plan.id);
    setForm({
      code: plan.code,
      name: plan.name,
      price: plan.price,
      maxUsers: plan.maxUsers,
      maxClients: plan.maxClients,
      maxTickets: plan.maxTickets?.toString() ?? '',
      maxStorageGb: plan.maxStorageGb,
      durationDays: plan.durationDays?.toString() ?? '',
      hasInventory: plan.hasInventory,
      hasTickets: plan.hasTickets,
      hasActivities: plan.hasActivities,
      hasManualDiagnosis: plan.hasManualDiagnosis,
      hasAIDiagnosis: plan.hasAIDiagnosis,
      hasInvoicing: plan.hasInvoicing,
      hasServices: plan.hasServices,
      hasDocuments: plan.hasDocuments,
      hasAdvancedKPIs: plan.hasAdvancedKPIs,
      hasPDFExport: plan.hasPDFExport,
      hasAutoEmails: plan.hasAutoEmails,
      hasBrandCustom: plan.hasBrandCustom,
      hasAuditLog: plan.hasAuditLog,
      hasMaintenances: plan.hasMaintenances,
      hasCoordinator: plan.hasCoordinator,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Código y nombre son requeridos');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        maxUsers: Number(form.maxUsers),
        maxClients: Number(form.maxClients),
        maxStorageGb: Number(form.maxStorageGb),
        maxTickets: form.maxTickets !== '' && form.maxTickets != null ? Number(form.maxTickets) : null,
        durationDays: form.durationDays !== '' && form.durationDays != null ? Number(form.durationDays) : null,
      };
      if (editingId) {
        await axios.patch(`/api/planes/${editingId}`, payload);
        toast.success('Plan actualizado');
      } else {
        await axios.post('/api/planes', payload);
        toast.success('Plan creado');
      }
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['plans'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el plan "${name}"? Solo se puede eliminar si no tiene empresas suscritas.`)) return;
    try {
      await axios.delete(`/api/planes/${id}`);
      toast.success('Plan eliminado');
      qc.invalidateQueries({ queryKey: ['plans'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const setFlag = (key: string, value: boolean) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Planes & Suscripciones
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión de planes del SaaS</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Nuevo Plan
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-lg font-bold">{editingId ? 'Editar Plan' : 'Nuevo Plan'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Básicos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label mb-1.5 block">Código único *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="BASIC, PROFESSIONAL..."
                    disabled={!!editingId}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Nombre del plan *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Plan Básico"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Precio mensual (COP)</label>
                  <input
                    type="number" min={0}
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Días de vigencia (Demo)</label>
                  <input
                    type="number" min={1}
                    value={form.durationDays}
                    onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                    placeholder="Solo para planes Demo"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Límites */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Límites del plan</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'maxUsers', label: 'Máx. usuarios', icon: Users },
                    { key: 'maxClients', label: 'Máx. clientes', icon: Building2 },
                    { key: 'maxTickets', label: 'Máx. tickets', icon: Ticket },
                    { key: 'maxStorageGb', label: 'Storage (GB)', icon: Database },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Icon className="w-3 h-3" /> {label}
                      </label>
                      <input
                        type="number" min={0}
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder="∞ ilimitado"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Deja vacío para ilimitado (tickets)</p>
              </div>

              {/* Feature flags */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Funcionalidades incluidas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FLAG_LABELS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => setFlag(key, !(form as any)[key])}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          (form as any)[key]
                            ? 'bg-primary border-primary'
                            : 'border-border group-hover:border-primary/50'
                        }`}
                      >
                        {(form as any)[key] && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="text-sm text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Actualizar Plan' : 'Crear Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay planes creados</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan: any) => (
            <div key={plan.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
              {/* Plan header */}
              <div className={`bg-gradient-to-br ${PLAN_COLORS[plan.code] || 'from-slate-500 to-slate-600'} p-5 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">{plan.code}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(plan)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id, plan.name)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-lg font-bold">{plan.name}</p>
                <p className="text-2xl font-bold mt-1">
                  {plan.price === 0 ? 'Gratis' : fmt(plan.price)}
                  {plan.price > 0 && <span className="text-sm font-normal opacity-70">/mes</span>}
                </p>
              </div>

              {/* Limits */}
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {[
                    { label: 'Usuarios', value: plan.maxUsers },
                    { label: 'Clientes', value: plan.maxClients },
                    { label: 'Tickets', value: plan.maxTickets ?? '∞' },
                    { label: 'Storage', value: `${plan.maxStorageGb} GB` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-xs">
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                  {plan.durationDays && (
                    <div className="text-xs col-span-2">
                      <span className="text-muted-foreground">Vigencia: </span>
                      <span className="font-semibold text-foreground">{plan.durationDays} días</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="px-4 py-3 flex-1">
                <div className="space-y-1">
                  {FLAG_LABELS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      {(plan as any)[key] ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={(plan as any)[key] ? 'text-foreground' : 'text-muted-foreground/50 line-through'}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  {plan._count?.subscriptions ?? 0} empresa(s) suscrita(s)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
