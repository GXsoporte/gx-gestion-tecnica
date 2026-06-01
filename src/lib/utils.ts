import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null, fmt = 'dd/MM/yyyy') {
  if (!date) return '—';
  return format(new Date(date), fmt, { locale: es });
}

export function formatDateTime(date: Date | string | null) {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
}

export function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function formatMinutes(minutes: number | null): string {
  if (!minutes) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function generateId(prefix: string, count: number): string {
  return `${prefix}-${String(count).padStart(6, '0')}`;
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN:             'Abierto',
  IN_PROGRESS:      'En proceso',
  PENDING_CLIENT:   'Pend. cliente',
  ESCALATED:        'Escalado',
  RESOLVED:         'Resuelto',
  CLOSED:           'Cerrado',
  // Flujo diagnóstico → solución
  IN_DIAGNOSIS:     'En diagnóstico',
  DIAGNOSIS_SENT:   'Diagnóstico enviado',
  REPAIR_APPROVED:  'Reparación aprobada',
  REPAIR_REJECTED:  'Reparación rechazada',
  REPAIR_DONE:      'Reparación completada',
  DELIVERED:        'Entregado',
  ARCHIVED:         'Archivado',
};

export const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN:             'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  PENDING_CLIENT:   'bg-purple-50 text-purple-700 border-purple-200',
  ESCALATED:        'bg-red-50 text-red-700 border-red-200',
  RESOLVED:         'bg-green-50 text-green-700 border-green-200',
  CLOSED:           'bg-slate-100 text-slate-600 border-slate-200',
  // Flujo diagnóstico → solución
  IN_DIAGNOSIS:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  DIAGNOSIS_SENT:   'bg-cyan-50 text-cyan-700 border-cyan-200',
  REPAIR_APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  REPAIR_REJECTED:  'bg-red-50 text-red-700 border-red-200',
  REPAIR_DONE:      'bg-teal-50 text-teal-700 border-teal-200',
  DELIVERED:        'bg-purple-50 text-purple-700 border-purple-200',
  ARCHIVED:         'bg-slate-100 text-slate-500 border-slate-200',
};

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Finalizado',
  ESCALATED: 'Escalado',
};

export const ACTIVITY_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  ESCALATED: 'bg-red-50 text-red-700 border-red-200',
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  MAINTENANCE: 'En mantenimiento',
  DIAGNOSIS: 'En diagnóstico',
  BORROWED: 'Prestado',
  DAMAGED: 'Dañado',
  RETIRED: 'Dado de baja',
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  MAINTENANCE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DIAGNOSIS: 'bg-blue-50 text-blue-700 border-blue-200',
  BORROWED: 'bg-purple-50 text-purple-700 border-purple-200',
  DAMAGED: 'bg-red-50 text-red-700 border-red-200',
  RETIRED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const TICKET_TYPE_LABELS: Record<string, string> = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  NETWORKS: 'Redes',
  MICROSOFT_365: 'Microsoft 365',
  INTERNET: 'Internet',
  PRINTERS: 'Impresoras',
  SERVER: 'Servidor',
  CAMERAS: 'Cámaras',
  REMOTE_SUPPORT: 'Soporte remoto',
  OTHER: 'Otro',
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  DESKTOP: 'Computador de escritorio',
  LAPTOP: 'Portátil',
  SERVER: 'Servidor',
  PRINTER: 'Impresora',
  NETWORK_DEVICE: 'Dispositivo de red',
  CAMERA: 'Cámara',
  PHONE: 'Teléfono',
  TABLET: 'Tablet',
  UPS: 'UPS',
  MONITOR: 'Monitor',
  SCANNER: 'Escáner',
  OTHER: 'Otro',
};

export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  PREDICTIVE: 'Predictivo',
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  COMPANY_ADMIN: 'Administrador',
  COORDINATOR: 'Coordinador',
  TECHNICIAN: 'Técnico',
  CLIENT: 'Cliente',
  VENDOR: 'Vendedor',
};
