'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Bell, X, CheckCheck, Activity, User, Shield,
  Plus, Pencil, Trash2, LogIn, LogOut, FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CREATE: { icon: Plus,     color: 'text-green-600 bg-green-100',  label: 'Creación'       },
  UPDATE: { icon: Pencil,   color: 'text-blue-600 bg-blue-100',    label: 'Actualización'  },
  DELETE: { icon: Trash2,   color: 'text-red-600 bg-red-100',      label: 'Eliminación'    },
  LOGIN:  { icon: LogIn,    color: 'text-purple-600 bg-purple-100',label: 'Acceso'         },
  LOGOUT: { icon: LogOut,   color: 'text-slate-600 bg-slate-100',  label: 'Cierre sesión'  },
  EXPORT: { icon: FileDown, color: 'text-amber-600 bg-amber-100',  label: 'Exportación'    },
};

const ENTITY_LABELS: Record<string, string> = {
  Ticket: 'ticket', Activity: 'actividad', Client: 'cliente',
  Asset: 'activo', Company: 'empresa', User: 'usuario',
  Maintenance: 'mantenimiento', Diagnosis: 'diagnóstico', Solution: 'solución',
};

const LAST_SEEN_KEY = 'gx_notif_last_seen';

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date>(() => {
    if (typeof window === 'undefined') return new Date();
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    return stored ? new Date(stored) : new Date(0);
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await axios.get('/api/audit-logs?limit=20');
      return data.data?.logs ?? [];
    },
    refetchInterval: 30_000,
  });

  const logs: any[] = data ?? [];

  const unreadCount = logs.filter(
    (l) => new Date(l.createdAt) > lastSeen
  ).length;

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const markAllRead = () => {
    const now = new Date();
    setLastSeen(now);
    localStorage.setItem(LAST_SEEN_KEY, now.toISOString());
  };

  function buildMessage(log: any) {
    const entity = ENTITY_LABELS[log.entity] || log.entity?.toLowerCase() || 'elemento';
    const action = ACTION_CONFIG[log.action]?.label?.toLowerCase() || log.action?.toLowerCase() || 'acción';
    const user = log.user?.name || 'Sistema';
    return `${user} realizó ${action} de ${entity}`;
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        title="Notificaciones"
      >
        <Bell className={cn('w-4 h-4', open ? 'text-primary' : 'text-muted-foreground')} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl border border-border shadow-premium z-50 flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Título */}
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold">Notificaciones</span>
              </div>
              {/* Acciones */}
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Leídas
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            {/* Badge de no leídas en línea separada — solo si hay */}
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                  {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
                </span>
              </p>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Cargando...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {logs.map((log) => {
                  const cfg = ACTION_CONFIG[log.action] ?? {
                    icon: Activity, color: 'text-slate-600 bg-slate-100', label: log.action,
                  };
                  const Icon = cfg.icon;
                  const isUnread = new Date(log.createdAt) > lastSeen;

                  return (
                    <li
                      key={log.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                        isUnread && 'bg-blue-50/50 dark:bg-blue-500/5'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.color)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug">
                          {buildMessage(log)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {logs.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 flex-shrink-0">
              <a
                href="/configuracion/seguridad"
                className="text-xs text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Ver todos los registros de auditoría →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
