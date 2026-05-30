'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Ticket, ClipboardList,
  Monitor, Loader2, ExternalLink, Users, Plus, Pencil, Trash2, X,
  Eye, EyeOff, User, Globe, Briefcase,
} from 'lucide-react';
import {
  cn, formatDate,
  TICKET_STATUS_LABELS, TICKET_STATUS_COLORS,
  ASSET_STATUS_LABELS, ASSET_STATUS_COLORS,
  ASSET_TYPE_LABELS,
} from '@/lib/utils';
import { ClientUserModal } from '../client-user-modal';
import { ClientUserDetail } from '../client-user-detail';

function MaskedField({ value }: { value?: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-mono">{show ? value : '••••••••'}</span>
      <button type="button" onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </div>
  );
}

export function ClientDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userModal, setUserModal] = useState<{ open: boolean; user?: any }>({ open: false });
  const [detailUser, setDetailUser] = useState<any>(null); // panel de detalle
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const USERS_PAGE = 6; // cuántos mostrar por defecto

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/clientes/${id}`);
      return data.data;
    },
  });

  const { data: clientUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ['client-users', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/clientes/${id}/usuarios`);
      return data.data ?? [];
    },
    enabled: !!client,
  });

  const handleDeleteUser = async (userId: string) => {
    try {
      await axios.delete(`/api/clientes/${id}/usuarios/${userId}`);
      toast.success('Usuario eliminado');
      refetchUsers();
    } catch {
      toast.error('Error al eliminar usuario');
    } finally {
      setConfirmDeleteUserId(null);
    }
  };

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
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">{client.code}</span>
            <span className={cn('badge', client.clientType === 'NATURAL' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
              {client.clientType === 'NATURAL' ? <><User className="w-3 h-3 inline mr-1" />Persona Natural</> : <><Building2 className="w-3 h-3 inline mr-1" />Empresa</>}
            </span>
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
              {client.cedula && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cédula</p>
                    <p className="text-sm font-medium">{client.cedula}</p>
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

      {/* ── Usuarios del cliente ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="section-title">Usuarios del cliente</h3>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{clientUsers.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Búsqueda */}
            <div className="relative">
              <input
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setShowAllUsers(true); }}
                placeholder="Buscar usuario..."
                className="pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <button
              onClick={() => setUserModal({ open: true })}
              className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo usuario
            </button>
          </div>
        </div>

        {(() => {
          const filtered = clientUsers.filter((u: any) =>
            !userSearch ||
            u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.cargo?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email1?.toLowerCase().includes(userSearch.toLowerCase())
          );
          const visible = showAllUsers ? filtered : filtered.slice(0, USERS_PAGE);

          if (filtered.length === 0) return (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {userSearch ? 'Sin resultados para la búsqueda' : 'No hay usuarios registrados'}
              </p>
              {!userSearch && (
                <button onClick={() => setUserModal({ open: true })} className="mt-3 text-xs text-primary hover:underline">
                  Agregar primer usuario
                </button>
              )}
            </div>
          );

          return (
            <>
              {/* Grid de tarjetas */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {visible.map((u: any) => (
                  <div key={u.id} className="border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-muted/20 transition-all">
                    {/* Cabecera tarjeta */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{u.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => setDetailUser(u)}
                            className="text-sm font-semibold truncate text-left hover:text-primary hover:underline transition-colors block w-full"
                          >
                            {u.name}
                          </button>
                          {u.cargo && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Briefcase className="w-3 h-3 flex-shrink-0" />{u.cargo}
                            </p>
                          )}
                          {u.phone && (
                            <p className="text-xs text-muted-foreground">{u.phone}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        <button onClick={() => setUserModal({ open: true, user: u })}
                          className="p-1 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors text-muted-foreground" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteUserId === u.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeleteUser(u.id)} className="text-[10px] text-white bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded font-medium">✓</button>
                            <button onClick={() => setConfirmDeleteUserId(null)} className="p-0.5 hover:bg-muted rounded"><X className="w-3 h-3 text-muted-foreground" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteUserId(u.id)}
                            className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors text-muted-foreground" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Credenciales compactas */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {(u.pcUsername || u.pcPassword) && (
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">🖥 PC</p>
                          {u.pcUsername && <p className="text-[10px] font-mono truncate">{u.pcUsername}</p>}
                          <MaskedField value={u.pcPassword} />
                        </div>
                      )}
                      {(u.adminUsername || u.adminPassword) && (
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">🛡 Admin</p>
                          {u.adminUsername && <p className="text-[10px] font-mono truncate">{u.adminUsername}</p>}
                          <MaskedField value={u.adminPassword} />
                        </div>
                      )}
                      {(u.email1 || u.email1Password) && (
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">✉ Correo 1</p>
                          {u.email1 && <p className="text-[10px] truncate">{u.email1}</p>}
                          <MaskedField value={u.email1Password} />
                        </div>
                      )}
                      {(u.email2 || u.email2Password) && (
                        <div className="bg-muted/40 rounded-lg p-2">
                          <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">✉ Correo 2</p>
                          {u.email2 && <p className="text-[10px] truncate">{u.email2}</p>}
                          <MaskedField value={u.email2Password} />
                        </div>
                      )}
                    </div>

                    {/* Equipos */}
                    {Array.isArray(u.assets) && u.assets.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {u.assets.map((a: any) => (
                          <Link key={a.id} href={`/inventario/${a.id}`}
                            className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 text-indigo-700 rounded px-1.5 py-0.5 text-[10px] hover:bg-indigo-100 transition-colors">
                            <Monitor className="w-2.5 h-2.5" />
                            <span className="font-medium truncate max-w-[80px]">{a.brand} {a.model}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Plataformas */}
                    {Array.isArray(u.platforms) && u.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {u.platforms.map((p: any, i: number) => (
                          <span key={i} className="bg-orange-50 border border-orange-200 text-orange-700 rounded px-1.5 py-0.5 text-[10px] font-medium truncate max-w-[90px]">
                            🌐 {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Ver más / Ver menos */}
              {filtered.length > USERS_PAGE && (
                <div className="px-4 pb-4 text-center border-t border-border pt-3">
                  <button
                    onClick={() => setShowAllUsers(v => !v)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {showAllUsers
                      ? `▲ Ver menos`
                      : `▼ Ver ${filtered.length - USERS_PAGE} usuario${filtered.length - USERS_PAGE > 1 ? 's' : ''} más`}
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Panel de detalle del usuario */}
      {detailUser && (
        <ClientUserDetail
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => {
            setUserModal({ open: true, user: detailUser });
            setDetailUser(null);
          }}
        />
      )}

      {/* Modal usuario */}
      {userModal.open && (
        <ClientUserModal
          clientId={id}
          clientName={client.companyName}
          clientType={client.clientType}
          clientEmail={client.email}
          user={userModal.user}
          onClose={() => setUserModal({ open: false })}
          onSuccess={() => {
            setUserModal({ open: false });
            refetchUsers();
            toast.success(userModal.user ? 'Usuario actualizado' : 'Usuario creado correctamente');
          }}
        />
      )}
    </div>
  );
}
