'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { PageHeader } from '@/components/ui/page-header';
import { Clock, Users, ClipboardList, TrendingUp } from 'lucide-react';
import { formatMinutes } from '@/lib/utils';

export function TiemposClient() {
  const { data: report } = useQuery({
    queryKey: ['report-tecnicos'],
    queryFn: async () => {
      const { data } = await axios.get('/api/reportes?type=tecnicos');
      return data.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control de Tiempos"
        description="Análisis de productividad y tiempo invertido por técnico y cliente"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tiempos' }]}
      />

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total horas</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatMinutes(report.reduce((acc: number, t: any) => acc + t.totalMinutes, 0))}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total actividades</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {report.reduce((acc: number, t: any) => acc + t.totalActivities, 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Técnicos activos</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{report.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="section-title">Productividad por técnico</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Técnico</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actividades</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tickets</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tiempo total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Productividad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.map((tech: any) => {
                    const maxActivities = Math.max(...report.map((t: any) => t.totalActivities), 1);
                    const productivity = Math.round((tech.totalActivities / maxActivities) * 100);
                    return (
                      <tr key={tech.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium">{tech.name}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{tech.email}</td>
                        <td className="px-6 py-4 text-sm">{tech.totalActivities}</td>
                        <td className="px-6 py-4 text-sm">{tech.totalTickets}</td>
                        <td className="px-6 py-4 text-sm">{formatMinutes(tech.totalMinutes)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${productivity}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10">{productivity}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
