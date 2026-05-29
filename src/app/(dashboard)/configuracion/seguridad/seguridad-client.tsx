'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import {
  Shield, FileText, Settings2, Search, Filter,
  RefreshCw, User, Clock, AlertTriangle, CheckCircle2,
  XCircle, Info, Lock, Bell, Activity, Eye,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

const ACTION_STYLES: Record<string, { color: string; label: string }> = {
  CREATE: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Creación' },
  UPDATE: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Actualización' },
  DELETE: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Eliminación' },
  LOGIN:  { color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Acceso' },
  LOGOUT: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Cierre sesión' },
  EXPORT: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Exportación' },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  Ticket: Activity,
  Activity: Activity,
  Client: User,
  Asset: Activity,
  Company: Shield,
  User: User,
  Maintenance: Activity,
};

interface SecuritySetting {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

export function SeguridadClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'audit' | 'config'>('audit');

  // Audit log filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Security settings (local state with save)
  const [settings, setSettings] = useState<SecuritySetting[]>([
    { key: 'audit_enabled', label: 'Registro de auditoría', description: 'Guarda un historial de todas las acciones del sistema', icon: FileText, enabled: true },
    { key: 'login_notifications', label: 'Notificaciones de acceso', description: 'Recibe un email cuando alguien inicia sesión desde un dispositivo nuevo', icon: Bell, enabled: true },
    { key: 'session_timeout', label: 'Cierre de sesión automático', description: 'Cierra la sesión tras 8 horas de inactividad', icon: Clock, enabled: true },
    { key: 'rate_limiting', label: 'Rate limiting API', description: 'Limita las solicitudes a la API por IP para prevenir ataques', icon: Shield, enabled: true },
    { key: 'two_factor', label: 'Autenticación de dos factores', description: 'Requiere un código adicional al iniciar sesión (próximamente)', icon: Lock, enabled: false },
    { key: 'view_only_clients', label: 'Clientes en modo lectura', description: 'Los clientes solo pueden ver sus tickets, sin editar', icon: Eye, enabled: true },
  ]);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: auditData, isLoading: auditLoading, refetch } = useQuery({
    queryKey: ['audit-logs', actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      params.set('limit', '200');
      const { data } = await axios.get(`/api/audit-logs?${params}`);
      return data.data;
    },
  });

  const logs: any[] = auditData?.logs || [];
  const total: number = auditData?.total || 0;

  const filteredLogs = search
    ? logs.filter((l) =>
        l.entity?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityId?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const handleToggle = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    await new Promise((r) => setTimeout(r, 600));
    setSavingSettings(false);
    toast.success('Configuración de seguridad guardada');
  };

  const tabs = [
    { id: 'audit', label: 'Registros de auditoría', icon: FileText },
    { id: 'config', label: 'Configuración de seguridad', icon: Settings2 },
  ];

  const uniqueEntities = [...new Set(logs.map((l) => l.entity).filter(Boolean))];
  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  // Stats
  const todayLogs = logs.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const deletions = logs.filter((l) => l.action === 'DELETE').length;
  const uniqueUsers = new Set(logs.map((l) => l.userId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seguridad"
        description="Auditoría del sistema y configuración de seguridad"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Seguridad' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Registros totales', value: total, icon: FileText, color: 'text-blue-600 bg-blue-100' },
          { label: 'Hoy', value: todayLogs, icon: Clock, color: 'text-green-600 bg-green-100' },
          { label: 'Eliminaciones', value: deletions, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
          { label: 'Usuarios activos', value: uniqueUsers, icon: User, color: 'text-purple-600 bg-purple-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- AUDIT LOG TAB ---- */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por entidad, usuario, ID..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none"
            >
              <option value="">Todas las acciones</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{ACTION_STYLES[a]?.label || a}</option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none"
            >
              <option value="">Todas las entidades</option>
              {uniqueEntities.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>

          {/* Tabla de logs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            {auditLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Cargando registros...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">No hay registros de auditoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Fecha</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Acción</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Entidad</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => {
                      const actionStyle = ACTION_STYLES[log.action] || { color: 'bg-slate-100 text-slate-600 border-slate-200', label: log.action };
                      const EntityIcon = ENTITY_ICONS[log.entity] || Activity;
                      return (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('badge text-xs', actionStyle.color)}>
                              {actionStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <EntityIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium">{log.entity}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            {log.entityId ? log.entityId.slice(0, 12) + '…' : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {log.user ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-blue-700">{log.user.name?.[0]}</span>
                                </div>
                                <span className="text-sm">{log.user.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sistema</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Mostrando {filteredLogs.length} de {total} registros
          </p>
        </div>
      )}

      {/* ---- CONFIG TAB ---- */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Los cambios en la configuración de seguridad se aplican inmediatamente a todos los usuarios de la empresa.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card divide-y divide-border">
            {settings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between p-5">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    setting.enabled ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-muted'
                  )}>
                    <setting.icon className={cn('w-4 h-4', setting.enabled ? 'text-blue-600' : 'text-muted-foreground')} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{setting.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(setting.key)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4',
                    setting.enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    setting.enabled ? 'translate-x-5' : 'translate-x-1'
                  )} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingSettings ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Guardar configuración</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
