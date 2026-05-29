import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Documentos' };

export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión Documental</h1>
          <p className="text-sm text-muted-foreground mt-1">Repositorio centralizado de documentos técnicos</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">📁</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Módulo Documental</h3>
        <p className="text-sm text-center max-w-sm">
          Este módulo permite subir, organizar, clasificar y compartir documentos técnicos, manuales y reportes.
          Configure las variables de entorno de almacenamiento para habilitarlo.
        </p>
      </div>
    </div>
  );
}
