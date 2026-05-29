'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Ticket,
  ClipboardList,
  Monitor,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  cn,
  formatDate,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  ASSET_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/utils';

export function ClientDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/clientes/${id}`);
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-muted-foreground font-mono">{client.code}</span>
            <span className={cn('badge', client.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>
              {client.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{client.companyName}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          {/* Info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4">Información general</h3>
            <div className="space-y-3">
              {client.nit && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">NIT</p>
                    <p className="text-sm font-medium">{client.nit}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Contacto</p>
                  <p className="text-sm font-medium">{client.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <a href={`mailto:${client.email}`} className="text-sm text-primary hover:underline">{client.email}</a>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.city && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="text-sm font-medium">{client.city}, {client.country}</p>
                    {client.address && <p className="text-xs text-muted-foreground">{client.address}</p>}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Cliente desde</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(client.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tickets', value: client._count?.tickets, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
              { label: 'Actividades', value: client._count?.activities, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
              { label: 'Activos', value: client._count?.assets, icon: Monitor, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
            ].map((s) => (
              <div key={s.label} className={cn('rounded-xl p-3 text-center border border-border', s.bg)}>
                <s.icon className={cn('w-5 h-5 mx-auto mb-1', s.color)} />
                <p className={cn('text-xl font-bold', s.color)}>{s.value || 0}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {client.observations && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <h3 className="section-title mb-2">Observaciones</h3>
              <p className="text-sm text-muted-foreground">{client.observations}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Tickets recientes */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="section-title">Tickets recientes</h3>
              <Link href={`/tickets?clientId=${id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {client.tickets?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Sin tickets</div>
              ) : (
                client.tickets?.slice(0, 5).map((t: any) => (
                  <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-blue-600">{t.ticketNumber}</span>
                        <span className={cn('badge', TICKET_STATUS_COLORS[t.status])}>{TICKET_STATUS_LABELS[t.status]}</span>
                      </div>
                      <p className="text-sm truncate">{t.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(t.createdAt)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Activos */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="section-title">Activos / Inventario</h3>
              <Link href={`/inventario?clientId=${id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {client.assets?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Sin activos registrados</div>
              ) : (
                client.assets?.slice(0, 5).map((a: any) => (
                  <Link key={a.id} href={`/inventario/${a.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{a.assetNumber}</span>
                        <span className={cn('badge', ASSET_STATUS_COLORS[a.status])}>{ASSET_STATUS_LABELS[a.status]}</span>
                      </div>
                      <p className="text-sm truncate">{a.brand} {a.model} · {ASSET_TYPE_LABELS[a.type]}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
