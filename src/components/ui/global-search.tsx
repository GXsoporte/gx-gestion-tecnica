'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Search, X, Ticket, Users, ClipboardList, Monitor,
  ArrowRight, Loader2, Hash,
} from 'lucide-react';
import { cn, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, ACTIVITY_STATUS_LABELS, ASSET_STATUS_LABELS } from '@/lib/utils';

interface SearchResults {
  tickets:     any[];
  clientes:    any[];
  actividades: any[];
  activos:     any[];
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const debouncedQuery = useDebounce(query, 280);

  // ── Fetch results ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); return; }
    let cancelled = false;
    setLoading(true);
    axios.get(`/api/busqueda?q=${encodeURIComponent(debouncedQuery)}`)
      .then(({ data }) => { if (!cancelled) { setResults(data.data); setActiveIdx(0); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Focus input on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [open]);

  // ── Flatten results for keyboard nav ──────────────────────────────────────
  const flatItems = results ? [
    ...results.tickets.map(t => ({ type: 'ticket', ...t })),
    ...results.clientes.map(c => ({ type: 'cliente', ...c })),
    ...results.actividades.map(a => ({ type: 'actividad', ...a })),
    ...results.activos.map(a => ({ type: 'activo', ...a })),
  ] : [];

  const navigateTo = useCallback((item: any) => {
    const urls: Record<string, string> = {
      ticket:    `/tickets/${item.id}`,
      cliente:   `/clientes/${item.id}`,
      actividad: `/actividades/${item.id}`,
      activo:    `/inventario/${item.id}`,
    };
    router.push(urls[item.type]);
    onClose();
  }, [router, onClose]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && flatItems[activeIdx]) {
        navigateTo(flatItems[activeIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatItems, activeIdx, navigateTo, onClose]);

  const totalResults = results
    ? results.tickets.length + results.clientes.length + results.actividades.length + results.activos.length
    : 0;

  if (!open) return null;

  // ── Section renderer ──────────────────────────────────────────────────────
  const Section = ({
    icon: Icon, label, items, color, renderItem,
  }: {
    icon: React.ElementType; label: string; items: any[]; color: string;
    renderItem: (item: any, globalIdx: number) => React.ReactNode;
  }) => {
    if (!items.length) return null;
    return (
      <div>
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border">
          <Icon className={cn('w-3.5 h-3.5', color)} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
        </div>
        {items.map((item, localIdx) => {
          const gIdx = flatItems.findIndex(f => f.type === item.type && f.id === item.id);
          return renderItem(item, gIdx);
        })}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[10vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl overflow-hidden">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            {loading
              ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin flex-shrink-0" />
              : <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              placeholder="Buscar tickets, clientes, activos, actividades..."
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Estado vacío inicial */}
            {!query && (
              <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <Search className="w-10 h-10 opacity-20" />
                <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> Tickets</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Clientes</span>
                  <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Actividades</span>
                  <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Activos</span>
                </div>
              </div>
            )}

            {/* Sin resultados */}
            {query.length >= 2 && !loading && results && totalResults === 0 && (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <Hash className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">Sin resultados para "{query}"</p>
                <p className="text-xs">Intenta con otro término o verifica la ortografía</p>
              </div>
            )}

            {/* Tickets */}
            {results && results.tickets.length > 0 && (
              <Section icon={Ticket} label="Tickets" items={results.tickets} color="text-blue-600"
                renderItem={(item, gIdx) => (
                  <button key={item.id} onClick={() => navigateTo({ ...item, type: 'ticket' })}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50 last:border-0',
                      gIdx === activeIdx && 'bg-blue-50 dark:bg-blue-500/10'
                    )}>
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-600 font-semibold">{item.ticketNumber}</span>
                        <span className={cn('badge text-xs', TICKET_STATUS_COLORS[item.status])}>
                          {TICKET_STATUS_LABELS[item.status]}
                        </span>
                        <span className={cn('badge text-xs', PRIORITY_COLORS[item.priority])}>
                          {PRIORITY_LABELS[item.priority]}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate mt-0.5">{item.subject}</p>
                      {item.client?.companyName && (
                        <p className="text-xs text-muted-foreground">{item.client.companyName}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )}
              />
            )}

            {/* Clientes */}
            {results && results.clientes.length > 0 && (
              <Section icon={Users} label="Clientes" items={results.clientes} color="text-green-600"
                renderItem={(item, gIdx) => (
                  <button key={item.id} onClick={() => navigateTo({ ...item, type: 'cliente' })}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50 last:border-0',
                      gIdx === activeIdx && 'bg-green-50 dark:bg-green-500/10'
                    )}>
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.companyName}</p>
                      <p className="text-xs text-muted-foreground">{item.contactName} · {item.email}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )}
              />
            )}

            {/* Actividades */}
            {results && results.actividades.length > 0 && (
              <Section icon={ClipboardList} label="Actividades" items={results.actividades} color="text-purple-600"
                renderItem={(item, gIdx) => (
                  <button key={item.id} onClick={() => navigateTo({ ...item, type: 'actividad' })}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50 last:border-0',
                      gIdx === activeIdx && 'bg-purple-50 dark:bg-purple-500/10'
                    )}>
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-purple-600 font-semibold">{item.activityNumber}</span>
                        <span className="badge text-xs bg-slate-100 text-slate-600 border-slate-200">
                          {ACTIVITY_STATUS_LABELS[item.status] || item.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate mt-0.5">{item.description}</p>
                      {item.client?.companyName && (
                        <p className="text-xs text-muted-foreground">{item.client.companyName}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )}
              />
            )}

            {/* Activos */}
            {results && results.activos.length > 0 && (
              <Section icon={Monitor} label="Inventario" items={results.activos} color="text-orange-600"
                renderItem={(item, gIdx) => (
                  <button key={item.id} onClick={() => navigateTo({ ...item, type: 'activo' })}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50 last:border-0',
                      gIdx === activeIdx && 'bg-orange-50 dark:bg-orange-500/10'
                    )}>
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Monitor className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-orange-600 font-semibold">{item.assetNumber}</span>
                        <span className="badge text-xs bg-slate-100 text-slate-600 border-slate-200">
                          {ASSET_STATUS_LABELS[item.status] || item.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">
                        {[item.brand, item.model].filter(Boolean).join(' ')}
                        {item.serial && <span className="text-muted-foreground"> · {item.serial}</span>}
                      </p>
                      {item.client?.companyName && (
                        <p className="text-xs text-muted-foreground">{item.client.companyName}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )}
              />
            )}
          </div>

          {/* Footer */}
          {results && totalResults > 0 && (
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{totalResults} resultado{totalResults !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 font-mono">↑↓</kbd> navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 font-mono">↵</kbd> abrir
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 font-mono">Esc</kbd> cerrar
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
