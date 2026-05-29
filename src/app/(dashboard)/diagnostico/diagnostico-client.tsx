'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  BrainCircuit,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Wrench,
  History,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { cn, formatDateTime } from '@/lib/utils';

interface DiagnosisResult {
  id: string;
  diagnosis: string;
  causes: string[];
  recommendations: string[];
  suggestedSolution: string;
  criticality: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estimatedTime?: string;
  tokens?: number;
}

const criticalityConfig = {
  BAJA: { label: 'Criticidad Baja', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2, dot: 'bg-green-500' },
  MEDIA: { label: 'Criticidad Media', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle, dot: 'bg-yellow-500' },
  ALTA: { label: 'Criticidad Alta', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle, dot: 'bg-orange-500' },
  CRITICA: { label: 'Criticidad Crítica', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertTriangle, dot: 'bg-red-500' },
};

const EXAMPLE_SYMPTOMS = [
  'Equipo lento, disco al 100%, Outlook se congela cada 5 minutos',
  'Pantalla azul de la muerte al iniciar Windows, código de error 0x0000007B',
  'La impresora HP LaserJet no imprime, muestra error de papel pero no hay atascos',
  'No hay conexión a internet en todas las estaciones de trabajo, router reiniciado sin éxito',
  'Error al iniciar sesión en Microsoft 365: "Tu cuenta ha sido bloqueada temporalmente"',
];

export function DiagnosticoClient() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ['diagnoses'],
    queryFn: async () => {
      const { data } = await axios.get('/api/diagnostico');
      return data.data;
    },
  });

  const handleSubmit = async () => {
    if (!input.trim() || input.trim().length < 10) {
      toast.error('Describe los síntomas con al menos 10 caracteres');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data } = await axios.post('/api/diagnostico', { input: input.trim() });
      const res = data.data;
      setResult({
        ...res,
        causes: typeof res.causes === 'string'
          ? res.causes.split('\n').filter(Boolean)
          : res.causes || [],
        recommendations: typeof res.recommendations === 'string'
          ? res.recommendations.split('\n').filter(Boolean)
          : res.recommendations || [],
      });
      toast.success('Diagnóstico generado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al generar diagnóstico. Verifique la API key de OpenAI.');
    } finally {
      setIsLoading(false);
    }
  };

  const criticality = result ? criticalityConfig[result.criticality] || criticalityConfig['MEDIA'] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnóstico Técnico con IA"
        description="Motor de diagnóstico inteligente basado en OpenAI GPT-4 para análisis técnico profesional"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Diagnóstico IA' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de entrada */}
        <div className="lg:col-span-1 space-y-5">
          {/* Input */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-white" />
              </div>
              <h3 className="section-title">Describe los síntomas</h3>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              placeholder="Describe los síntomas o fallas del equipo con el mayor detalle posible...

Ejemplo:
- Equipo lento al iniciar
- Disco al 100% en el administrador de tareas
- Outlook se congela al abrir correos grandes"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between mt-2 mb-4">
              <span className="text-xs text-muted-foreground">{input.length} caracteres</span>
              <button
                onClick={() => setInput('')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analizando síntomas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar Diagnóstico IA
                </>
              )}
            </button>
          </div>

          {/* Ejemplos */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Ejemplos de síntomas</h3>
            <div className="space-y-2">
              {EXAMPLE_SYMPTOMS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setInput(ex)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg px-3 py-2 transition-colors border border-border/50 hover:border-border leading-relaxed"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel de resultado */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-12 shadow-card flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <BrainCircuit className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Analizando síntomas</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                El motor de IA está procesando los síntomas para generar un diagnóstico técnico profesional...
              </p>
              <div className="flex gap-1.5 mt-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Criticidad */}
              <div className={cn('rounded-xl border p-5', criticality?.bg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2.5 h-2.5 rounded-full', criticality?.dot)} />
                    <span className={cn('text-sm font-bold', criticality?.color)}>
                      {criticality?.label}
                    </span>
                  </div>
                  {result.estimatedTime && (
                    <span className={cn('text-xs', criticality?.color)}>
                      Tiempo estimado: {result.estimatedTime}
                    </span>
                  )}
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <BrainCircuit className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="section-title">Diagnóstico técnico</h3>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{result.diagnosis}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Causas */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Posibles causas</h3>
                  </div>
                  <ul className="space-y-2">
                    {(Array.isArray(result.causes) ? result.causes : [result.causes]).map((cause: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="w-5 h-5 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{cause.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recomendaciones */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Recomendaciones</h3>
                  </div>
                  <ul className="space-y-2">
                    {(Array.isArray(result.recommendations) ? result.recommendations : [result.recommendations]).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{rec.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Solución sugerida */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-50 dark:bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="section-title">Solución técnica sugerida</h3>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {result.suggestedSolution}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const text = `DIAGNÓSTICO TÉCNICO IA\n\nSíntomas: ${input}\n\nDiagnóstico: ${result.diagnosis}\n\nCausas:\n${Array.isArray(result.causes) ? result.causes.join('\n') : result.causes}\n\nRecomendaciones:\n${Array.isArray(result.recommendations) ? result.recommendations.join('\n') : result.recommendations}\n\nSolución sugerida:\n${result.suggestedSolution}\n\nCriticidad: ${result.criticality}`;
                    navigator.clipboard.writeText(text);
                    toast.success('Diagnóstico copiado al portapapeles');
                  }}
                  className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Copiar diagnóstico
                </button>
                <button
                  onClick={() => { setResult(null); setInput(''); }}
                  className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  Nuevo diagnóstico
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-12 shadow-card flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 rounded-2xl flex items-center justify-center mb-5">
                <BrainCircuit className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Motor de diagnóstico IA
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
                Describe los síntomas o fallas del equipo en el panel izquierdo y el sistema generará un diagnóstico técnico profesional con causas, recomendaciones y soluciones.
              </p>
              <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                {[
                  { icon: AlertTriangle, label: 'Causas probables', color: 'text-red-500' },
                  { icon: Lightbulb, label: 'Recomendaciones', color: 'text-yellow-500' },
                  { icon: Wrench, label: 'Solución técnica', color: 'text-green-500' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mx-auto mb-2">
                      <item.icon className={cn('w-5 h-5', item.color)} />
                    </div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="section-title">Historial de diagnósticos</span>
              <span className="text-xs text-muted-foreground">({history.length})</span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-border divide-y divide-border">
              {history.map((d: any) => (
                <div
                  key={d.id}
                  className="px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setInput(d.input);
                    setResult({
                      id: d.id,
                      diagnosis: d.diagnosis,
                      causes: d.causes.split('\n').filter(Boolean),
                      recommendations: d.recommendations.split('\n').filter(Boolean),
                      suggestedSolution: d.suggestedSolution,
                      criticality: d.criticality as any,
                    });
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.input}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.diagnosis}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('badge text-xs',
                        d.criticality === 'CRITICA' ? 'bg-red-50 text-red-700 border-red-200' :
                        d.criticality === 'ALTA' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        d.criticality === 'MEDIA' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      )}>
                        {d.criticality}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
