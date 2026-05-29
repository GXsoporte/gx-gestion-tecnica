'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Briefcase, Plus, ChevronDown, ChevronRight, Pencil,
  Trash2, ToggleLeft, ToggleRight, Tag, X, Loader2
} from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

function ServiceForm({ initial, onSave, onCancel, loading }: any) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);

  return (
    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="form-label mb-1 block">Nombre del servicio *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Mantenimiento preventivo..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="form-label mb-1 block">Precio base</label>
          <input type="number" min={0} value={basePrice} onChange={e => setBasePrice(Number(e.target.value))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="sm:col-span-3">
          <label className="form-label mb-1 block">Descripción</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
        <button onClick={() => onSave({ name, description, basePrice: Number(basePrice) })}
          disabled={loading || !name.trim()}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  );
}

function SubForm({ serviceId, initial, onSave, onCancel, loading }: any) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? 0);

  return (
    <div className="bg-primary/5 rounded-lg p-3 space-y-2 ml-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del subservicio..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
        </div>
        <div>
          <input type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="Precio"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
        </div>
        <div className="sm:col-span-3">
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-2 py-1 text-xs border border-border rounded hover:bg-muted">Cancelar</button>
        <button onClick={() => onSave({ name, description, price: Number(price) })}
          disabled={loading || !name.trim()}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
          Guardar
        </button>
      </div>
    </div>
  );
}

export function ServiciosClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session?.user?.role ?? '');

  const [showNewService, setShowNewService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await axios.get('/api/servicios');
      return data.data;
    },
  });

  const saveService = async (formData: any, id?: string) => {
    setSaving(true);
    try {
      if (id) {
        await axios.patch(`/api/servicios/${id}`, formData);
        toast.success('Servicio actualizado');
        setEditingService(null);
      } else {
        await axios.post('/api/servicios', formData);
        toast.success('Servicio creado');
        setShowNewService(false);
      }
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await axios.patch(`/api/servicios/${id}`, { isActive: !current });
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch { toast.error('Error'); }
  };

  const deleteService = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el servicio "${name}"?`)) return;
    try {
      await axios.delete(`/api/servicios/${id}`);
      toast.success('Servicio eliminado');
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  const saveSub = async (serviceId: string, formData: any) => {
    setSaving(true);
    try {
      await axios.post(`/api/servicios/${serviceId}/subservicios`, formData);
      toast.success('Subservicio agregado');
      setAddingSubTo(null);
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Servicios y Subservicios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Catálogo de servicios técnicos ofrecidos</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNewService(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        )}
      </div>

      {showNewService && (
        <ServiceForm onSave={(d: any) => saveService(d)} onCancel={() => setShowNewService(false)} loading={saving} />
      )}

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : services.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay servicios registrados</p>
          {isAdmin && <p className="text-xs text-muted-foreground/60 mt-1">Crea el primero con el botón de arriba</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc: any) => (
            <div key={svc.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Cabecera del servicio */}
              {editingService === svc.id ? (
                <div className="p-4">
                  <ServiceForm initial={svc} onSave={(d: any) => saveService(d, svc.id)}
                    onCancel={() => setEditingService(null)} loading={saving} />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpandedService(expandedService === svc.id ? null : svc.id)}
                    className="p-1 hover:bg-muted rounded">
                    {expandedService === svc.id
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{svc.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{svc.serviceNumber}</span>
                      {!svc.isActive && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inactivo</span>
                      )}
                    </div>
                    {svc.description && <p className="text-xs text-muted-foreground truncate">{svc.description}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-primary">{fmt(svc.basePrice)}</span>
                    <span className="text-xs text-muted-foreground">
                      <Tag className="w-3 h-3 inline mr-1" />
                      {svc.subservices?.length ?? 0} subservicios
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActive(svc.id, svc.isActive)} title={svc.isActive ? 'Desactivar' : 'Activar'}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                          {svc.isActive
                            ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingService(svc.id)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteService(svc.id, svc.name)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subservicios expandidos */}
              {expandedService === svc.id && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subservicios</span>
                    {isAdmin && (
                      <button onClick={() => setAddingSubTo(svc.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
                        <Plus className="w-3 h-3" /> Agregar subservicio
                      </button>
                    )}
                  </div>

                  {addingSubTo === svc.id && (
                    <SubForm serviceId={svc.id} onSave={(d: any) => saveSub(svc.id, d)}
                      onCancel={() => setAddingSubTo(null)} loading={saving} />
                  )}

                  {svc.subservices?.length === 0 && addingSubTo !== svc.id ? (
                    <p className="text-xs text-muted-foreground py-2">No hay subservicios registrados</p>
                  ) : (
                    svc.subservices?.map((sub: any) => (
                      <div key={sub.id} className="flex items-center gap-3 bg-card rounded-lg px-3 py-2 border border-border/50">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-foreground">{sub.name}</span>
                          {sub.description && <p className="text-xs text-muted-foreground truncate">{sub.description}</p>}
                        </div>
                        <span className="text-sm font-semibold text-primary">{fmt(sub.price)}</span>
                        {!sub.isActive && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inactivo</span>
                        )}
                      </div>
                    ))
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
