'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Monitor,
  Cpu,
  HardDrive,
  MemoryStick,
  Calendar,
  Shield,
  User,
  MapPin,
  Loader2,
  Ticket,
  ClipboardList,
  Wrench,
  Phone,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Briefcase,
  StickyNote,
} from 'lucide-react';
import {
  cn,
  formatDate,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  ASSET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
} from '@/lib/utils';

/* ── Fila de credencial con botón revelar/copiar ── */
function CredRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-mono truncate">{show ? value : '••••••••'}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => setShow(!show)} className="p-1 rounded hover:bg-muted transition-colors" title={show ? 'Ocultar' : 'Mostrar'}>
          {show ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        <button onClick={copy} className="p-1 rounded hover:bg-muted transition-colors" title="Copiar">
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function AssetDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/inventario/${id}`);
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

  if (!asset) return null;

  const warrantyExpired = asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-xs text-blue-600">{asset.assetNumber}</span>
            <span className={cn('badge', ASSET_STATUS_COLORS[asset.status])}>
              {ASSET_STATUS_LABELS[asset.status]}
            </span>
          </div>
          <h1 className="text-xl font-bold">{asset.brand} {asset.model}</h1>
          <p className="text-sm text-muted-foreground">{ASSET_TYPE_LABELS[asset.type]} · {asset.client?.companyName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          {/* Asignación */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card space-y-4">
            <h3 className="section-title">Asignación</h3>

            {/* Ubicación */}
            <div className="space-y-2">
              {asset.assignedUser && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Usuario asignado</p>
                    <p className="text-sm font-medium">{asset.assignedUser}</p>
                  </div>
                </div>
              )}
              {asset.area && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Área</p>
                    <p className="text-sm font-medium">{asset.area}</p>
                    {asset.location && <p className="text-xs text-muted-foreground">{asset.location}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Datos del cliente-usuario vinculado */}
            {asset.clientUser && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del usuario del equipo</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Nombre</p>
                        <p className="text-sm font-medium">{asset.clientUser.name}</p>
                      </div>
                    </div>
                    {asset.clientUser.cargo && (
                      <div className="flex items-start gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cargo</p>
                          <p className="text-sm">{asset.clientUser.cargo}</p>
                        </div>
                      </div>
                    )}
                    {asset.clientUser.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold">Teléfono</p>
                          <p className="text-sm">{asset.clientUser.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Credenciales PC */}
                {(asset.clientUser.pcUsername || asset.clientUser.adminUsername) && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credenciales del equipo</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 space-y-1 divide-y divide-amber-100 dark:divide-amber-500/10">
                      {asset.clientUser.pcUsername && (
                        <div className="pb-1">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Usuario PC</p>
                          <p className="text-sm font-mono">{asset.clientUser.pcUsername}</p>
                        </div>
                      )}
                      {asset.clientUser.pcPassword && (
                        <div className="pt-1">
                          <CredRow label="Contraseña PC" value={asset.clientUser.pcPassword} />
                        </div>
                      )}
                      {asset.clientUser.adminUsername && (
                        <div className="pt-1 pb-1">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Usuario Administrador</p>
                          <p className="text-sm font-mono">{asset.clientUser.adminUsername}</p>
                        </div>
                      )}
                      {asset.clientUser.adminPassword && (
                        <div className="pt-1">
                          <CredRow label="Contraseña Admin" value={asset.clientUser.adminPassword} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Correos */}
                {(asset.clientUser.email1 || asset.clientUser.email2) && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Correos electrónicos</p>
                    </div>
                    <div className="space-y-3">
                      {asset.clientUser.email1 && (
                        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3 space-y-1 divide-y divide-blue-100 dark:divide-blue-500/10">
                          <div className="pb-1">
                            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Correo 1</p>
                            <p className="text-sm">{asset.clientUser.email1}</p>
                          </div>
                          {asset.clientUser.email1Password && (
                            <div className="pt-1">
                              <CredRow label="Contraseña" value={asset.clientUser.email1Password} />
                            </div>
                          )}
                        </div>
                      )}
                      {asset.clientUser.email2 && (
                        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3 space-y-1 divide-y divide-blue-100 dark:divide-blue-500/10">
                          <div className="pb-1">
                            <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Correo 2</p>
                            <p className="text-sm">{asset.clientUser.email2}</p>
                          </div>
                          {asset.clientUser.email2Password && (
                            <div className="pt-1">
                              <CredRow label="Contraseña" value={asset.clientUser.email2Password} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Plataformas */}
                {asset.clientUser.platforms && (() => {
                  try {
                    const platforms = JSON.parse(asset.clientUser.platforms);
                    if (!platforms?.length) return null;
                    return (
                      <div className="border-t border-border pt-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <Globe className="w-3.5 h-3.5 text-purple-500" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plataformas / aplicaciones</p>
                        </div>
                        <div className="space-y-2">
                          {platforms.map((p: any, i: number) => (
                            <div key={i} className="bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded-lg p-3 space-y-1 divide-y divide-purple-100 dark:divide-purple-500/10">
                              <div className="pb-1">
                                <p className="text-xs font-semibold text-purple-700">{p.name}</p>
                                {p.username && <p className="text-sm font-mono">{p.username}</p>}
                              </div>
                              {p.password && (
                                <div className="pt-1">
                                  <CredRow label="Contraseña" value={p.password} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* Notas */}
                {asset.clientUser.notes && (
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</p>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{asset.clientUser.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Especificaciones */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="section-title mb-4">Especificaciones</h3>
            <div className="space-y-3">
              {asset.serial && (
                <div>
                  <p className="text-xs text-muted-foreground">Serial</p>
                  <p className="text-sm font-mono font-medium">{asset.serial}</p>
                </div>
              )}
              {asset.processor && (
                <div className="flex items-start gap-2">
                  <Cpu className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Procesador</p>
                    <p className="text-sm">{asset.processor}</p>
                  </div>
                </div>
              )}
              {asset.ram && (
                <div className="flex items-start gap-2">
                  <MemoryStick className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">RAM</p>
                    <p className="text-sm">{asset.ram}</p>
                  </div>
                </div>
              )}
              {asset.storage && (
                <div className="flex items-start gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Almacenamiento</p>
                    <p className="text-sm">{asset.storage}</p>
                  </div>
                </div>
              )}
              {asset.operatingSystem && (
                <div className="flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sistema operativo</p>
                    <p className="text-sm">{asset.operatingSystem}</p>
                  </div>
                </div>
              )}
              {asset.purchaseDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de compra</p>
                    <p className="text-sm">{formatDate(asset.purchaseDate)}</p>
                  </div>
                </div>
              )}
              {asset.warrantyExpiry && (
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Garantía</p>
                    <p className={cn('text-sm', warrantyExpired ? 'text-red-600 font-medium' : '')}>
                      {formatDate(asset.warrantyExpiry)}
                      {warrantyExpired && ' (Expirada)'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {asset.softwareList && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <h3 className="section-title mb-3">Software instalado</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{asset.softwareList}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          {/* Tickets del activo */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="section-title">Historial de Tickets</h3>
            </div>
            <div className="divide-y divide-border">
              {asset.tickets?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Ticket className="w-8 h-8 opacity-20" />
                  Sin tickets registrados
                </div>
              ) : (
                asset.tickets?.slice(0, 5).map((t: any) => (
                  <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-blue-600">{t.ticketNumber}</span>
                        <span className={cn('badge', TICKET_STATUS_COLORS[t.status])}>{TICKET_STATUS_LABELS[t.status]}</span>
                      </div>
                      <p className="text-sm truncate">{t.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Actividades */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="section-title">Historial de Actividades</h3>
            </div>
            <div className="divide-y divide-border">
              {asset.activities?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <ClipboardList className="w-8 h-8 opacity-20" />
                  Sin actividades registradas
                </div>
              ) : (
                asset.activities?.slice(0, 5).map((a: any) => (
                  <Link key={a.id} href={`/actividades/${a.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-blue-600">{a.activityNumber}</span>
                        <span className={cn('badge', ACTIVITY_STATUS_COLORS[a.status])}>{ACTIVITY_STATUS_LABELS[a.status]}</span>
                      </div>
                      <p className="text-sm truncate">{a.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.technician?.name}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Mantenimientos */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="section-title">Historial de Mantenimientos</h3>
            </div>
            <div className="divide-y divide-border">
              {asset.maintenances?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Wrench className="w-8 h-8 opacity-20" />
                  Sin mantenimientos registrados
                </div>
              ) : (
                asset.maintenances?.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.technician?.name} · {formatDate(m.scheduledDate)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
