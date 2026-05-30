'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  X, Copy, Eye, EyeOff, Monitor, Shield, Mail,
  Globe, Briefcase, Phone, CheckCheck, Package,
  KeyRound, User, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ─── Copy hook ───────────────────────────────────────────── */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copiado');
      setTimeout(() => setCopied(null), 1800);
    });
  };
  return { copied, copy };
}

/* ─── Fila de credencial ─────────────────────────────────── */
function CredRow({
  label, value, id, copied, copy, isPassword = false,
}: {
  label: string; value?: string; id: string;
  copied: string | null; copy: (v: string, k: string) => void;
  isPassword?: boolean;
}) {
  const [show, setShow] = useState(false);
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className={cn('text-sm font-mono truncate', isPassword && !show ? 'text-muted-foreground tracking-widest' : 'text-foreground')}>
          {isPassword && !show ? '• • • • • • • •' : value}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPassword && (
          <button onClick={() => setShow(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          onClick={() => copy(value, id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
          title="Copiar"
        >
          {copied === id
            ? <CheckCheck className="w-3.5 h-3.5 text-green-500" />
            : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Bloque de credenciales (ej: PC, Admin) ─────────────── */
function CredBlock({
  icon, title, color, bg, fields,
}: {
  icon: React.ReactNode; title: string; color: string; bg: string;
  fields: { label: string; value?: string; id: string; isPassword?: boolean }[];
}) {
  const { copied, copy } = useCopy();
  const hasData = fields.some(f => f.value);
  if (!hasData) return null;

  return (
    <div className="space-y-2">
      <div className={cn('flex items-center gap-2 px-1')}>
        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', bg)}>
          <span className={color}>{icon}</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1.5">
        {fields.map(f => (
          <CredRow key={f.id} {...f} copied={copied} copy={copy} />
        ))}
      </div>
    </div>
  );
}

/* ─── Tabs ───────────────────────────────────────────────── */
type Tab = 'credenciales' | 'equipos' | 'plataformas';

/* ─── Componente principal ───────────────────────────────── */
interface ClientUserDetailProps {
  user: any;
  onClose: () => void;
  onEdit: () => void;
}

export function ClientUserDetail({ user, onClose, onEdit }: ClientUserDetailProps) {
  const [tab, setTab] = useState<Tab>('credenciales');

  const hasPlatforms = Array.isArray(user.platforms) && user.platforms.length > 0;
  const hasEquipment = Array.isArray(user.assets) && user.assets.length > 0;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'credenciales', label: 'Credenciales' },
    { id: 'equipos',      label: 'Equipos',      count: user.assets?.length },
    { id: 'plataformas',  label: 'Plataformas',  count: user.platforms?.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
          {/* Avatar grande */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black text-primary">
              {user.name?.[0]?.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              {user.cargo && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />{user.cargo}
                </span>
              )}
              {user.phone && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />{user.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="px-3.5 py-1.5 text-xs font-semibold border border-border rounded-xl hover:bg-muted transition-colors"
            >
              Editar
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0.5 px-6 pt-4 pb-0 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all border-b-2 -mb-px',
                tab === t.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Tab: Credenciales ── */}
          {tab === 'credenciales' && (
            <div className="space-y-5">
              <CredBlock
                icon={<Monitor className="w-3.5 h-3.5" />}
                title="Usuario PC" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-500/20"
                fields={[
                  { label: 'Usuario',     value: user.pcUsername, id: 'pcUser' },
                  { label: 'Contraseña',  value: user.pcPassword, id: 'pcPwd', isPassword: true },
                ]}
              />
              <CredBlock
                icon={<Shield className="w-3.5 h-3.5" />}
                title="Administrador" color="text-purple-600" bg="bg-purple-100 dark:bg-purple-500/20"
                fields={[
                  { label: 'Usuario',     value: user.adminUsername, id: 'adminUser' },
                  { label: 'Contraseña',  value: user.adminPassword, id: 'adminPwd', isPassword: true },
                ]}
              />
              <CredBlock
                icon={<Mail className="w-3.5 h-3.5" />}
                title="Correo 1" color="text-green-600" bg="bg-green-100 dark:bg-green-500/20"
                fields={[
                  { label: 'Correo',      value: user.email1,        id: 'email1' },
                  { label: 'Contraseña',  value: user.email1Password, id: 'email1Pwd', isPassword: true },
                ]}
              />
              <CredBlock
                icon={<Mail className="w-3.5 h-3.5" />}
                title="Correo 2" color="text-teal-600" bg="bg-teal-100 dark:bg-teal-500/20"
                fields={[
                  { label: 'Correo',      value: user.email2,        id: 'email2' },
                  { label: 'Contraseña',  value: user.email2Password, id: 'email2Pwd', isPassword: true },
                ]}
              />

              {/* Sin credenciales */}
              {![user.pcUsername, user.pcPassword, user.adminUsername, user.adminPassword,
                 user.email1, user.email1Password, user.email2, user.email2Password].some(Boolean) && (
                <div className="text-center py-10">
                  <KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">Sin credenciales registradas</p>
                  <button onClick={onEdit} className="mt-3 text-xs text-primary hover:underline">
                    + Agregar credenciales
                  </button>
                </div>
              )}

              {user.notes && (
                <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-sm text-amber-900 dark:text-amber-200">{user.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Equipos ── */}
          {tab === 'equipos' && (
            <div className="space-y-2">
              {!hasEquipment ? (
                <div className="text-center py-10">
                  <Monitor className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">Sin equipos asignados</p>
                  <button onClick={onEdit} className="mt-3 text-xs text-primary hover:underline">
                    + Asignar equipos
                  </button>
                </div>
              ) : (
                user.assets.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/inventario/${a.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Monitor className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{a.brand} {a.model}</p>
                      <p className="text-xs font-mono text-muted-foreground">{a.assetNumber}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </Link>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Plataformas ── */}
          {tab === 'plataformas' && (
            <div className="space-y-3">
              {!hasPlatforms ? (
                <div className="text-center py-10">
                  <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">Sin plataformas registradas</p>
                  <button onClick={onEdit} className="mt-3 text-xs text-primary hover:underline">
                    + Agregar plataformas
                  </button>
                </div>
              ) : (
                user.platforms.map((p: any, i: number) => {
                  const { copied, copy } = { copied: null as string | null, copy: (_v: string, _k: string) => {} };
                  return (
                    <PlatformBlock key={i} platform={p} index={i} />
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Bloque de plataforma (necesita su propio useCopy) ─────── */
function PlatformBlock({ platform, index }: { platform: any; index: number }) {
  const { copied, copy } = useCopy();
  return (
    <div className="border border-orange-200 dark:border-orange-500/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-orange-50 dark:bg-orange-500/10">
        <Globe className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-orange-800 dark:text-orange-300">{platform.name}</span>
      </div>
      <div className="px-4 py-3 space-y-1.5 bg-white dark:bg-slate-900">
        <CredRow label="Usuario" value={platform.username} id={`p${index}-user`} copied={copied} copy={copy} />
        <CredRow label="Contraseña" value={platform.password} id={`p${index}-pwd`} copied={copied} copy={copy} isPassword />
        {!platform.username && !platform.password && (
          <p className="text-xs text-muted-foreground py-1">Sin credenciales</p>
        )}
      </div>
    </div>
  );
}
