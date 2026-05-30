'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  X, Copy, Eye, EyeOff, Monitor, Shield, Mail,
  Globe, Briefcase, Phone, User, CheckCheck, Package,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── Helpers ──────────────────────────────────────────────── */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copied, copy };
}

function CopyBtn({ value, id, copied, copy }: {
  value?: string; id: string;
  copied: string | null; copy: (v: string, k: string) => void;
}) {
  if (!value) return null;
  return (
    <button
      onClick={() => copy(value, id)}
      title="Copiar"
      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
    >
      {copied === id
        ? <CheckCheck className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

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
    <div className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={cn('text-sm font-mono flex-1 truncate', isPassword && !show && 'tracking-widest text-muted-foreground')}>
          {isPassword && !show ? '••••••••' : value}
        </span>
        {isPassword && (
          <button onClick={() => setShow(v => !v)} className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <CopyBtn value={show || !isPassword ? value : value} id={id} copied={copied} copy={copy} />
      </div>
    </div>
  );
}

function Section({
  icon, title, color, children,
}: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border p-4', color)}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────── */
interface ClientUserDetailProps {
  user: any;
  onClose: () => void;
  onEdit: () => void;
}

export function ClientUserDetail({ user, onClose, onEdit }: ClientUserDetailProps) {
  const { copied, copy } = useCopy();

  const hasCreds = (fields: string[]) => fields.some(f => user[f]);

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex">
      {/* Fondo oscuro */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel deslizable desde la derecha */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header sticky */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-border px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {user.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">{user.name}</h2>
                <div className="flex items-center gap-3 mt-0.5">
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
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Editar
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-5 space-y-4">

          {/* ── Usuario PC ── */}
          {hasCreds(['pcUsername', 'pcPassword']) && (
            <Section
              icon={<Monitor className="w-4 h-4 text-blue-500" />}
              title="Usuario PC"
              color="border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5"
            >
              <CredRow label="Usuario" value={user.pcUsername} id="pcUser" copied={copied} copy={copy} />
              <CredRow label="Contraseña" value={user.pcPassword} id="pcPwd" copied={copied} copy={copy} isPassword />
            </Section>
          )}

          {/* ── Admin ── */}
          {hasCreds(['adminUsername', 'adminPassword']) && (
            <Section
              icon={<Shield className="w-4 h-4 text-purple-500" />}
              title="Usuario Administrador"
              color="border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-500/5"
            >
              <CredRow label="Usuario" value={user.adminUsername} id="adminUser" copied={copied} copy={copy} />
              <CredRow label="Contraseña" value={user.adminPassword} id="adminPwd" copied={copied} copy={copy} isPassword />
            </Section>
          )}

          {/* ── Correos ── */}
          {hasCreds(['email1', 'email1Password', 'email2', 'email2Password']) && (
            <Section
              icon={<Mail className="w-4 h-4 text-green-500" />}
              title="Correos electrónicos"
              color="border-green-200 dark:border-green-500/20 bg-green-50/50 dark:bg-green-500/5"
            >
              {hasCreds(['email1', 'email1Password']) && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Correo 1</p>
                  <CredRow label="Dirección" value={user.email1} id="email1" copied={copied} copy={copy} />
                  <CredRow label="Contraseña" value={user.email1Password} id="email1Pwd" copied={copied} copy={copy} isPassword />
                </div>
              )}
              {hasCreds(['email2', 'email2Password']) && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Correo 2</p>
                  <CredRow label="Dirección" value={user.email2} id="email2" copied={copied} copy={copy} />
                  <CredRow label="Contraseña" value={user.email2Password} id="email2Pwd" copied={copied} copy={copy} isPassword />
                </div>
              )}
            </Section>
          )}

          {/* ── Equipos ── */}
          {Array.isArray(user.assets) && user.assets.length > 0 && (
            <Section
              icon={<Package className="w-4 h-4 text-indigo-500" />}
              title="Equipos asignados"
              color="border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5"
            >
              <div className="space-y-2">
                {user.assets.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/inventario/${a.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors"
                  >
                    <Monitor className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.brand} {a.model}</p>
                      <p className="text-xs font-mono text-muted-foreground">{a.assetNumber}</p>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-medium">Ver →</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* ── Otras plataformas ── */}
          {Array.isArray(user.platforms) && user.platforms.length > 0 && (
            <Section
              icon={<Globe className="w-4 h-4 text-orange-500" />}
              title="Otras plataformas"
              color="border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5"
            >
              <div className="space-y-4">
                {user.platforms.map((p: any, i: number) => (
                  <div key={i}>
                    <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1.5 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> {p.name}
                    </p>
                    <CredRow label="Usuario" value={p.username} id={`plat-${i}-user`} copied={copied} copy={copy} />
                    <CredRow label="Contraseña" value={p.password} id={`plat-${i}-pwd`} copied={copied} copy={copy} isPassword />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Notas ── */}
          {user.notes && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notas</p>
              <p className="text-sm text-foreground">{user.notes}</p>
            </div>
          )}

          {/* Sin información */}
          {!hasCreds(['pcUsername','pcPassword','adminUsername','adminPassword',
            'email1','email1Password','email2','email2Password']) &&
            !user.assets?.length && !user.platforms?.length && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin credenciales registradas</p>
              <button onClick={onEdit} className="mt-3 text-xs text-primary hover:underline">
                + Agregar información
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
