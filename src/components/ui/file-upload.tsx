'use client';

import { useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Paperclip, Upload, X, FileText, Image, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface FileUploadProps {
  entityType: 'tickets' | 'actividades' | 'mantenimientos';
  entityId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  folder?: string;
  readOnly?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  entityType,
  entityId,
  attachments,
  onAttachmentsChange,
  folder = 'general',
  readOnly = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);

        const { data: uploadRes } = await axios.post('/api/upload', fd);
        const fileData = uploadRes.data;

        await axios.post(`/api/${entityType}/${entityId}/attachments`, fileData);
        uploaded++;
      } catch (err: any) {
        toast.error(err.response?.data?.error || `Error al subir ${file.name}`);
      }
    }

    setUploading(false);
    if (uploaded > 0) {
      toast.success(uploaded === 1 ? 'Archivo adjuntado' : `${uploaded} archivos adjuntados`);
      onAttachmentsChange();
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    setDeletingId(attachment.id);
    try {
      await axios.delete(`/api/attachments/${attachment.id}`);
      toast.success('Adjunto eliminado');
      onAttachmentsChange();
    } catch {
      toast.error('Error al eliminar adjunto');
    } finally {
      setDeletingId(null);
    }
  };

  const isPdf = (mime: string) => mime === 'application/pdf';
  const isImage = (mime: string) => mime.startsWith('image/');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!readOnly && (
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm">Subiendo archivos...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-6 h-6" />
              <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para seleccionar</p>
              <p className="text-xs">Imágenes (JPG, PNG, WEBP) y PDF · Máx. 10 MB por archivo</p>
            </div>
          )}
        </div>
      )}

      {/* List of attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border group"
            >
              {/* Thumbnail / icon */}
              {isImage(att.mimeType) ? (
                <a href={att.url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                  <img
                    src={att.url}
                    alt={att.originalName}
                    className="w-10 h-10 rounded object-cover border border-border"
                  />
                </a>
              ) : (
                <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Abrir"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(att)}
                    disabled={deletingId === att.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === att.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground text-center py-4">Sin archivos adjuntos</p>
      )}
    </div>
  );
}
