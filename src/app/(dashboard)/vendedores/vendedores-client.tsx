'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  UserCheck, Plus, Pencil, X, Loader2, Building2,
  Phone, Mail, ToggleLeft, ToggleRight, Percent,
  ChevronDown, Check,
} from 'lucide-react';

interface VendorFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  commission: number;
  notes: string;
}

const defaultForm = (): VendorFormData => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  commission: 0,
  notes: '',
});

export function VendedoresClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ commission: number; notes: string; companyIds: string[] }>({
    commission: 0, notes: '', companyIds: [],
  });
  const [createForm, setCreateForm] = useState<VendorFormData>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data } = await axios.get('/api/vendedores');
      return data.data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-list'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data } = await axios.get('/api/empresas');
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

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Nombre, email y contraseña son requeridos');
      return;
    }
    setSaving(true);
    try {
      await axios.post('/api/vendedores', {
        ...createForm,
        commission: Number(createForm.commission),
      });
      toast.success('Vendedor creado exitosamente');
      setShowCreate(false);
      setCreateForm(defaultForm());
      qc.invalidateQueries({ queryKey: ['vendors'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al crear vendedor');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (vendor: any) => {
    setEditingId(vendor.id);
    setEditForm({
      commission: vendor.commission,
      notes: vendor.notes ?? '',
      companyIds: vendor.assignedCompanies?.map((ac: any) => ac.companyId) ?? [],
    });
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      await axios.patch(`/api/vendedores/${id}`, {
        commission: Number(editForm.commission),
        notes: editForm.notes,
        companyIds: editForm.companyIds,
      });
      toast.success('Vendedor actualizado');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['vendors'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (vendor: any) => {
    try {
      await axios.patch(`/api/vendedores/${vendor.id}`, { isActive: !vendor.isActive });
      toast.success(vendor.isActive ? 'Vendedor desactivado' : 'Vendedor activado');
      qc.invalidateQueries({ queryKey: ['vendors'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  const toggleCompany = (companyId: string) => {
    setEditForm(f => ({
      ...f,
      companyIds: f.companyIds.includes(companyId)
        ? f.companyIds.filter(id => id !== companyId)
        : [...f.companyIds, companyId],
    }));
  };

  const inputClass = 'w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Vendedores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión de vendedores del sistema</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Nuevo Vendedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total vendedores</p>
          <p className="text-2xl font-bold">{vendors.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Activos</p>
          <p className="text-2xl font-bold text-emerald-600">{vendors.filter((v: any) => v.isActive).length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Empresas asignadas</p>
          <p className="text-2xl font-bold text-blue-600">
            {vendors.reduce((sum: number, v: any) => sum + (v.assignedCompanies?.length ?? 0), 0)}
          </p>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">Nuevo Vendedor</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label mb-1 block">Nombre completo *</label>
                  <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Juan García" className={inputClass} />
                </div>
                <div>
                  <label className="form-label mb-1 block">Email *</label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="vendedor@empresa.com" className={inputClass} />
                </div>
                <div>
                  <label className="form-label mb-1 block">Teléfono</label>
                  <input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+57 300 000 0000" className={inputClass} />
                </div>
                <div>
                  <label className="form-label mb-1 block">Contraseña *</label>
                  <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 8 caracteres" className={inputClass} />
                </div>
                <div>
                  <label className="form-label mb-1 block">Comisión (%)</label>
                  <input type="number" min={0} max={100} step={0.5}
                    value={createForm.commission} onChange={e => setCreateForm(f => ({ ...f, commission: Number(e.target.value) }))}
                    className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="form-label mb-1 block">Notas</label>
                  <input value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notas sobre el vendedor..." className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted">
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear Vendedor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <UserCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay vendedores registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {editingId === vendor.id ? (
                /* Edit mode */
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{vendor.user?.name}</h3>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label mb-1 block">Comisión (%)</label>
                      <input type="number" min={0} max={100} step={0.5}
                        value={editForm.commission}
                        onChange={e => setEditForm(f => ({ ...f, commission: Number(e.target.value) }))}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className="form-label mb-1 block">Notas</label>
                      <input value={editForm.notes}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        className={inputClass} />
                    </div>
                  </div>
                  {/* Company assignment */}
                  <div>
                    <label className="form-label mb-2 block">Empresas asignadas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {companies.map((co: any) => (
                        <label key={co.id} className="flex items-center gap-2 cursor-pointer group">
                          <div
                            onClick={() => toggleCompany(co.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              editForm.companyIds.includes(co.id)
                                ? 'bg-primary border-primary'
                                : 'border-border group-hover:border-primary/50'
                            }`}
                          >
                            {editForm.companyIds.includes(co.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <span className="text-xs text-foreground truncate">{co.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">
                      Cancelar
                    </button>
                    <button onClick={() => handleUpdate(vendor.id)} disabled={saving}
                      className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      vendor.isActive ? 'bg-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {vendor.user?.name?.charAt(0)?.toUpperCase() ?? 'V'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{vendor.user?.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{vendor.vendorNumber}</span>
                        {!vendor.isActive && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inactivo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {vendor.user?.email}
                        </span>
                        {vendor.user?.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {vendor.user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary flex items-center gap-0.5">
                          {vendor.commission}<Percent className="w-3.5 h-3.5" />
                        </p>
                        <p className="text-xs text-muted-foreground">comisión</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {vendor.assignedCompanies?.length ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">empresas</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleActive(vendor)}
                          title={vendor.isActive ? 'Desactivar' : 'Activar'}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                        >
                          {vendor.isActive
                            ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                            : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button onClick={() => openEdit(vendor)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedId(expandedId === vendor.id ? null : vendor.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === vendor.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: companies list */}
                  {expandedId === vendor.id && (
                    <div className="border-t border-border px-5 py-3 bg-muted/10">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Empresas asignadas ({vendor.assignedCompanies?.length ?? 0})
                      </p>
                      {vendor.assignedCompanies?.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sin empresas asignadas</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {vendor.assignedCompanies?.map((ac: any) => (
                            <span key={ac.id} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">
                              <Building2 className="w-3 h-3" /> {ac.company?.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {vendor.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">Notas: {vendor.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
