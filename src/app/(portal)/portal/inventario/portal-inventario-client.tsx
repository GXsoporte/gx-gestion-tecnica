'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Monitor, X, Loader2 } from 'lucide-react';
import { cn, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS, ASSET_TYPE_LABELS } from '@/lib/utils';

function AssetDetailModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const rows: [string, string | undefined | null][] = [
    ['Número de activo', asset.assetNumber],
    ['Tipo', ASSET_TYPE_LABELS[asset.type] ?? asset.type],
    ['Marca', asset.brand],
    ['Modelo', asset.model],
    ['Serial', asset.serial],
    ['Procesador', asset.processor],
    ['RAM', asset.ram],
    ['Almacenamiento', asset.storage],
    ['Sistema operativo', asset.operatingSystem],
    ['Área', asset.area],
    ['Ubicación', asset.location],
    ['Estado', ASSET_STATUS_LABELS[asset.status] ?? asset.status],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="font-mono font-bold text-primary text-sm">{asset.assetNumber}</p>
            <p className="font-semibold text-foreground">{[asset.brand, asset.model].filter(Boolean).join(' ')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm gap-3">
              <span className="text-muted-foreground font-medium flex-shrink-0">{label}</span>
              <span className="text-foreground text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PortalInventarioClient() {
  const [selected, setSelected] = useState<any | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['portal-inventario'],
    queryFn: async () => {
      const { data } = await axios.get('/api/portal/mis-equipos');
      return data.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="w-6 h-6 text-primary" />
          Mis equipos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Equipos asignados a tu usuario. Haz clic en uno para ver los detalles.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-border">
          <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tienes equipos asignados</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assets.map((a: any) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm p-5 text-left hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {[a.brand, a.model].filter(Boolean).join(' ') || 'Equipo sin nombre'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{a.assetNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{ASSET_TYPE_LABELS[a.type] ?? a.type}</span>
                {a.serial && <span className="text-xs text-muted-foreground">· S/N: {a.serial}</span>}
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border ml-auto', ASSET_STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                  {ASSET_STATUS_LABELS[a.status] ?? a.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <AssetDetailModal asset={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
