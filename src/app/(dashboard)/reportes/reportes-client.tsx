'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Download, FileSpreadsheet, Loader2,
  Ticket, ClipboardList, Monitor, Users, BarChart3, Calendar, TrendingUp, Hash,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  TICKET_STATUS_LABELS, PRIORITY_LABELS,
  ACTIVITY_STATUS_LABELS, ASSET_TYPE_LABELS, ASSET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
} from '@/lib/utils';

type ReportType = 'summary' | 'tickets' | 'actividades' | 'inventario' | 'tecnicos' | 'monthly';

const reportOptions = [
  { type: 'summary'     as ReportType, label: 'Resumen general',        icon: BarChart3,    desc: 'KPIs y métricas globales del sistema' },
  { type: 'tickets'     as ReportType, label: 'Reporte de tickets',      icon: Ticket,       desc: 'Listado completo de tickets con detalle' },
  { type: 'actividades' as ReportType, label: 'Reporte de actividades',  icon: ClipboardList,desc: 'Registro de actividades técnicas' },
  { type: 'inventario'  as ReportType, label: 'Inventario de activos',   icon: Monitor,      desc: 'Hoja de vida completa de equipos' },
  { type: 'tecnicos'    as ReportType, label: 'Productividad técnicos',  icon: Users,        desc: 'Métricas de rendimiento por técnico' },
  { type: 'monthly'     as ReportType, label: 'Reporte mensual',         icon: Calendar,     desc: 'Evolución mensual de tickets y actividades' },
];

// ── Flatten helpers ─────────────────────────────────────────────────────────
function flattenRow(row: any, type: ReportType): Record<string, string | number> {
  const fmtDate = (v: any) => (v ? new Date(v).toLocaleDateString('es-CO') : '');

  if (type === 'tickets') {
    return {
      'Número':              row.ticketNumber ?? '',
      'Asunto':              row.subject ?? '',
      'Estado':              TICKET_STATUS_LABELS[row.status]   || row.status || '',
      'Prioridad':           PRIORITY_LABELS[row.priority]      || row.priority || '',
      'Tipo':                TICKET_TYPE_LABELS[row.type]       || row.type || '',
      'Solicitante':         row.requesterName ?? '',
      'Email solicitante':   row.requesterEmail ?? '',
      'Teléfono':            row.requesterPhone ?? '',
      'Cliente':             row.client?.companyName ?? '',
      'Técnico asignado':    row.assignedTo?.name ?? 'Sin asignar',
      'Creado por':          row.createdBy?.name ?? '',
      'Fecha creación':      fmtDate(row.createdAt),
      'Última actualización':fmtDate(row.updatedAt),
    };
  }
  if (type === 'actividades') {
    return {
      'Número':           row.activityNumber ?? '',
      'Descripción':      row.description ?? '',
      'Estado':           ACTIVITY_STATUS_LABELS[row.status] || row.status || '',
      'Tipo':             row.activityType ?? '',
      'Cliente':          row.client?.companyName ?? '',
      'Técnico':          row.technician?.name ?? '',
      'Inicio':           fmtDate(row.startDate),
      'Fin':              fmtDate(row.endDate),
      'Minutos':          row.totalMinutes ?? 0,
      'Fecha creación':   fmtDate(row.createdAt),
    };
  }
  if (type === 'inventario') {
    return {
      'Número':          row.assetNumber ?? '',
      'Nombre':          row.name ?? '',
      'Tipo':            ASSET_TYPE_LABELS[row.assetType]   || row.assetType || '',
      'Marca':           row.brand ?? '',
      'Modelo':          row.model ?? '',
      'Nº de serie':     row.serialNumber ?? '',
      'Estado':          ASSET_STATUS_LABELS[row.status]    || row.status || '',
      'Cliente':         row.client?.companyName ?? '',
      'Asignado a':      row.assignedUser ?? '',
      'Fecha de compra': fmtDate(row.purchaseDate),
      'Garantía hasta':  fmtDate(row.warrantyUntil),
    };
  }
  if (type === 'tecnicos') {
    return {
      'Técnico':            row.name ?? '',
      'Email':              row.email ?? '',
      'Total Tickets':      row.totalTickets ?? 0,
      'Total Actividades':  row.totalActivities ?? 0,
      'Minutos trabajados': row.totalMinutes ?? 0,
      'Horas trabajadas':   row.totalMinutes ? Math.round((row.totalMinutes / 60) * 10) / 10 : 0,
    };
  }
  if (type === 'monthly') {
    return {
      'Mes':                        row.mes ?? '',
      'Tickets creados':            row.tickets ?? 0,
      'Tickets resueltos':          row.ticketsResueltos ?? 0,
      'Tasa de resolución (%)':     row.tasaResolucion ?? 0,
      'Actividades':                row.actividades ?? 0,
      'Actividades completadas':    row.actividadesCompletadas ?? 0,
    };
  }
  return row;
}

// Placeholder por tipo para el filtro de número
const NUMERO_PLACEHOLDER: Partial<Record<ReportType, string>> = {
  tickets:     'Ej. GX-TCK-000008',
  actividades: 'Ej. GX-ACT-000001',
  inventario:  'Ej. GX-AST-000001',
};

// ── Component ───────────────────────────────────────────────────────────────
export function ReportesClient() {
  const [selectedType, setSelectedType] = useState<ReportType>('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  // Datos de la empresa (logo + info para encabezado de PDF)
  const { data: companyData } = useQuery({
    queryKey: ['mi-empresa'],
    queryFn: async () => {
      const { data } = await axios.get('/api/mi-empresa');
      return data.data as {
        name: string; nit?: string; logo?: string | null;
        email?: string; phone?: string; city?: string; address?: string;
      };
    },
    retry: false, // Super Admin no tiene empresa → no reintentar
  });

  // Limpiar filtro de número al cambiar tipo
  const handleSelectType = (type: ReportType) => {
    setSelectedType(type);
    setFilterNumero('');
  };

  const hasNumeroFilter = ['tickets', 'actividades', 'inventario'].includes(selectedType);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', selectedType, dateFrom, dateTo, filterNumero],
    queryFn: async () => {
      const params = new URLSearchParams({ type: selectedType });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (filterNumero) params.set('numero', filterNumero);
      const { data } = await axios.get(`/api/reportes?${params}`);
      return data.data;
    },
  });

  // ── Excel export ───────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      setGenerating('excel');
      const { utils, writeFile } = await import('xlsx');
      const params = new URLSearchParams({ type: selectedType });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (filterNumero) params.set('numero', filterNumero);
      const { data } = await axios.get(`/api/reportes?${params}`);
      const reportLabel = reportOptions.find(r => r.type === selectedType)?.label || 'Reporte';

      let flatRows: Record<string, any>[];

      if (selectedType === 'summary') {
        const d = data.data;
        flatRows = [{
          'Total Tickets':                    d.totalTickets,
          'Tickets Abiertos':                 d.openTickets,
          'Tickets Resueltos':                d.resolvedTickets,
          'Total Actividades':                d.totalActivities,
          'Actividades Completadas':          d.completedActivities,
          'Total Activos':                    d.totalAssets,
          'Total Clientes':                   d.totalClients,
          'Tasa de Resolución (%)':           d.resolutionRate,
          'Tasa Completitud Actividades (%)': d.activityCompletionRate,
        }];
      } else {
        const rows = Array.isArray(data.data) ? data.data : [data.data];
        flatRows = rows.map((r: any) => flattenRow(r, selectedType));
      }

      const ws = utils.json_to_sheet(flatRows);

      // Auto column widths
      const colWidths = Object.keys(flatRows[0] || {}).map((k) => ({
        wch: Math.max(k.length + 2, 12),
      }));
      ws['!cols'] = colWidths;

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, reportLabel.substring(0, 31));
      writeFile(wb, `GX-${selectedType}-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exportado correctamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al exportar Excel');
    } finally {
      setGenerating(null);
    }
  };

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    try {
      setGenerating('pdf');
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const params = new URLSearchParams({ type: selectedType });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (filterNumero) params.set('numero', filterNumero);
      const { data } = await axios.get(`/api/reportes?${params}`);
      const reportLabel = reportOptions.find(r => r.type === selectedType)?.label || 'Reporte';
      const rawRows: any[] = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
      const now = new Date().toLocaleString('es-CO');
      const today = new Date().toLocaleDateString('es-CO');

      // Siempre vertical A4
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = doc.internal.pageSize.width;   // 210
      const PH = doc.internal.pageSize.height;  // 297
      const M = 14;
      const CW = PW - M * 2; // 182

      // ── Utilidades de dibujo ─────────────────────────────────────────────────
      const HEADER_H = 54; // altura de la banda superior

      const drawHeader = () => {
        // Banda azul principal
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, PW, HEADER_H, 'F');
        // Acento lateral oscuro
        doc.setFillColor(29, 78, 216);
        doc.rect(0, 0, 4, HEADER_H, 'F');

        let textX = M + 2; // posición X del texto (avanza si hay logo)

        // ── Logo de la empresa ──────────────────────────────────────────────
        if (companyData?.logo) {
          try {
            // Dibujar sobre fondo blanco redondeado para que el logo luzca bien
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(M + 2, 5, 42, 28, 2, 2, 'F');
            doc.addImage(companyData.logo, 'PNG', M + 3, 6, 40, 26, undefined, 'FAST');
            textX = M + 50; // texto empieza después del logo
          } catch {
            textX = M + 2; // fallback si falla la imagen
          }
        }

        // ── Nombre y datos de la empresa (izquierda) ───────────────────────
        const compName = companyData?.name || 'GX Soporte';
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(compName, textX, 14);

        // Datos secundarios: NIT · Tel · Ciudad
        const infoItems: string[] = [];
        if (companyData?.nit)   infoItems.push(`NIT: ${companyData.nit}`);
        if (companyData?.phone) infoItems.push(`Tel: ${companyData.phone}`);
        if (companyData?.city)  infoItems.push(companyData.city);
        if (infoItems.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(191, 219, 254);
          doc.text(infoItems.join('   ·   '), textX, 21);
        }
        if (companyData?.email) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(191, 219, 254);
          doc.text(companyData.email, textX, 27);
        }

        // ── Separador fino ─────────────────────────────────────────────────
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(M + 2, 33, PW - M, 33);
        doc.setLineDashPattern([], 0);
        doc.setLineWidth(0.2);

        // ── Tipo de reporte y metadatos (parte baja de la banda) ───────────
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(reportLabel.toUpperCase(), M + 2, 41);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(191, 219, 254);
        const meta: string[] = [`Generado: ${now}`];
        if (dateFrom || dateTo) meta.push(`Período: ${dateFrom || '—'} → ${dateTo || '—'}`);
        if (filterNumero) meta.push(`Nº: ${filterNumero}`);
        doc.text(meta.join('   ·   '), M + 2, 48);

        // "Preparado por GX Soporte" (derecha)
        doc.setTextColor(191, 219, 254);
        doc.setFontSize(7);
        doc.text('Preparado por GX Soporte', PW - M, 41, { align: 'right' });

        doc.setTextColor(0, 0, 0);
      };

      const drawFooter = (page: number, total: number) => {
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.line(M, PH - 12, M + CW, PH - 12);
        doc.text(`${companyData?.name || 'GX Soporte'} · ${reportLabel}`, M, PH - 7);
        doc.text(`Página ${page} de ${total}`, M + CW, PH - 7, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      };

      // ═══════════════════════════════════════════════════════════════════════
      // MODO FICHA INDIVIDUAL (filterNumero + 1 resultado)
      // ═══════════════════════════════════════════════════════════════════════
      const isSingle = !!(filterNumero && rawRows.length === 1);
      const CONTENT_START = HEADER_H + 6; // primera línea de contenido

      if (isSingle) {
        drawHeader();
        const row = rawRows[0];
        let y = CONTENT_START;

        // Helpers
        const section = (title: string) => {
          y += 2;
          doc.setFillColor(239, 246, 255);
          doc.rect(M, y, CW, 7.5, 'F');
          doc.setFillColor(37, 99, 235);
          doc.rect(M, y, 3, 7.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(29, 78, 216);
          doc.text(title, M + 6, y + 5.2);
          doc.setTextColor(0, 0, 0);
          y += 11;
        };

        const row2 = (l1: string, v1: string, l2: string, v2: string) => {
          const half = CW / 2 - 3;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(l1, M, y);
          doc.text(l2, M + half + 6, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(String(v1 || '—'), M, y);
          doc.text(String(v2 || '—'), M + half + 6, y);
          y += 7;
        };

        const row1 = (label: string, value: string) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(label, M, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(String(value || '—'), M, y);
          y += 7;
        };

        const textBox = (value: string) => {
          const lines = doc.splitTextToSize(String(value || '—'), CW - 8);
          const bh = Math.max(lines.length * 5.5, 12) + 8;
          doc.setDrawColor(191, 219, 254);
          doc.setFillColor(239, 246, 255);
          doc.roundedRect(M, y, CW, bh, 2, 2, 'FD');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(lines, M + 4, y + 6.5);
          y += bh + 6;
        };

        const badge = (text: string, r: number, g: number, b: number) => {
          const tw = doc.getTextWidth(text) + 8;
          doc.setFillColor(r, g, b);
          doc.roundedRect(M + CW - tw - 2, y + 3, tw, 8, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(text, M + CW - tw + 2, y + 8.5);
          doc.setTextColor(0, 0, 0);
        };

        const divider = () => {
          doc.setDrawColor(226, 232, 240);
          doc.line(M, y, M + CW, y);
          y += 4;
        };

        const signatureSection = () => {
          y = Math.max(y + 6, PH - 72);
          doc.setDrawColor(226, 232, 240);
          doc.line(M, y, M + CW, y);
          y += 5;
          section('FIRMAS Y APROBACIÓN');
          const half = (CW - 10) / 2;
          // Caja izquierda
          doc.setDrawColor(203, 213, 225);
          doc.rect(M, y, half, 28, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text('Técnico responsable', M + 3, y + 6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text('Nombre: _________________________', M + 3, y + 13);
          doc.text('Firma:  _________________________', M + 3, y + 19);
          doc.text(`Fecha:  ${today}`, M + 3, y + 25);
          // Caja derecha
          doc.setDrawColor(203, 213, 225);
          doc.rect(M + half + 10, y, half, 28, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text('Recibido por / Cliente', M + half + 13, y + 6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text('Nombre: _________________________', M + half + 13, y + 13);
          doc.text('Firma:  _________________________', M + half + 13, y + 19);
          doc.text('Fecha:  ___/___/______', M + half + 13, y + 25);
          doc.setTextColor(0, 0, 0);
          y += 32;
        };

        // ── TICKET ──────────────────────────────────────────────────────────
        if (selectedType === 'tickets') {
          const f: any = flattenRow(row, 'tickets');

          // Número + estado
          doc.setFillColor(239, 246, 255);
          doc.roundedRect(M, y, CW, 16, 3, 3, 'F');
          doc.setDrawColor(191, 219, 254);
          doc.roundedRect(M, y, CW, 16, 3, 3, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(29, 78, 216);
          doc.text(f['Número'], M + 5, y + 10.5);
          badge(f['Estado'], 37, 99, 235);
          y += 20;

          // Asunto
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(15, 23, 42);
          const subjLines = doc.splitTextToSize(f['Asunto'] || '—', CW);
          doc.text(subjLines, M, y);
          y += subjLines.length * 7 + 3;
          divider();

          section('INFORMACIÓN DEL TICKET');
          row2('PRIORIDAD',            f['Prioridad'],            'TIPO DE INCIDENTE',     f['Tipo']);
          row2('FECHA DE CREACIÓN',    f['Fecha creación'],       'ÚLTIMA ACTUALIZACIÓN',  f['Última actualización']);
          row1('CREADO POR',           f['Creado por']);

          section('DATOS DEL SOLICITANTE');
          row2('NOMBRE COMPLETO',      f['Solicitante'],           'CORREO ELECTRÓNICO',    f['Email solicitante']);
          row1('TELÉFONO',             f['Teléfono']);

          section('CLIENTE Y ASIGNACIÓN');
          row2('EMPRESA CLIENTE',      f['Cliente'],               'TÉCNICO ASIGNADO',      f['Técnico asignado']);

          section('DESCRIPCIÓN DEL PROBLEMA');
          textBox(row.description || row.subject || '');

          signatureSection();
        }

        // ── ACTIVIDAD ────────────────────────────────────────────────────────
        else if (selectedType === 'actividades') {
          const f: any = flattenRow(row, 'actividades');

          doc.setFillColor(239, 246, 255);
          doc.roundedRect(M, y, CW, 16, 3, 3, 'F');
          doc.setDrawColor(191, 219, 254);
          doc.roundedRect(M, y, CW, 16, 3, 3, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(29, 78, 216);
          doc.text(f['Número'], M + 5, y + 10.5);
          badge(f['Estado'], 16, 185, 129);
          y += 20;
          divider();

          section('INFORMACIÓN DE LA ACTIVIDAD');
          row2('TIPO DE ACTIVIDAD',  f['Tipo'] || '—',   'ESTADO',            f['Estado']);
          row2('FECHA DE INICIO',    f['Inicio'] || '—', 'FECHA DE FIN',      f['Fin'] || '—');
          row2('MINUTOS TRABAJADOS', String(f['Minutos']), 'FECHA REGISTRO',   f['Fecha creación']);

          section('ASIGNACIÓN');
          row2('EMPRESA CLIENTE',   f['Cliente'] || '—', 'TÉCNICO RESPONSABLE', f['Técnico'] || '—');

          section('DESCRIPCIÓN DE LA ACTIVIDAD');
          textBox(row.description || '');

          signatureSection();
        }

        // ── INVENTARIO ───────────────────────────────────────────────────────
        else if (selectedType === 'inventario') {
          const f: any = flattenRow(row, 'inventario');

          doc.setFillColor(239, 246, 255);
          doc.roundedRect(M, y, CW, 16, 3, 3, 'F');
          doc.setDrawColor(191, 219, 254);
          doc.roundedRect(M, y, CW, 16, 3, 3, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(29, 78, 216);
          doc.text(f['Número'], M + 5, y + 10.5);
          badge(f['Estado'], 139, 92, 246);
          y += 20;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(f['Nombre'] || '—', M, y);
          y += 8;
          divider();

          section('IDENTIFICACIÓN DEL ACTIVO');
          row2('TIPO DE ACTIVO',   f['Tipo'] || '—',       'ESTADO ACTUAL',    f['Estado'] || '—');
          row2('MARCA',            f['Marca'] || '—',      'MODELO',           f['Modelo'] || '—');
          row2('NÚMERO DE SERIE',  f['Nº de serie'] || '—','CLIENTE ASIGNADO', f['Cliente'] || '—');

          section('UBICACIÓN Y RESPONSABILIDAD');
          row2('ASIGNADO A',       f['Asignado a'] || '—', 'EMPRESA',          f['Cliente'] || '—');

          section('INFORMACIÓN COMERCIAL');
          row2('FECHA DE COMPRA',  f['Fecha de compra'] || '—', 'GARANTÍA HASTA', f['Garantía hasta'] || '—');

          if (row.observations || row.description) {
            section('OBSERVACIONES');
            textBox(row.observations || row.description || '');
          }

          y = Math.max(y + 6, PH - 72);
          doc.setDrawColor(226, 232, 240);
          doc.line(M, y, M + CW, y);
          y += 5;
          section('RESPONSABLE DE REGISTRO');
          const half = (CW - 10) / 2;
          doc.setDrawColor(203, 213, 225);
          doc.rect(M, y, half, 22, 'D');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
          doc.text('Registrado por', M + 3, y + 6);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
          doc.text('Nombre: ______________________', M + 3, y + 12);
          doc.text(`Fecha:  ${today}`, M + 3, y + 18);
          doc.setTextColor(0, 0, 0);
          y += 26;
        }

        // ── TÉCNICO ──────────────────────────────────────────────────────────
        else if (selectedType === 'tecnicos') {
          const f: any = flattenRow(row, 'tecnicos');

          doc.setFillColor(239, 246, 255);
          doc.roundedRect(M, y, CW, 22, 3, 3, 'F');
          doc.setDrawColor(191, 219, 254);
          doc.roundedRect(M, y, CW, 22, 3, 3, 'D');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(29, 78, 216);
          doc.text(f['Técnico'], M + 5, y + 10);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(f['Email'], M + 5, y + 17);
          y += 26;
          divider();

          section('MÉTRICAS DE PRODUCTIVIDAD');
          row2('TOTAL TICKETS ASIGNADOS', String(f['Total Tickets']), 'TOTAL ACTIVIDADES', String(f['Total Actividades']));
          row2('MINUTOS TRABAJADOS', String(f['Minutos trabajados']), 'HORAS TRABAJADAS', String(f['Horas trabajadas']));
        }

        drawFooter(1, 1);

      // ═══════════════════════════════════════════════════════════════════════
      // MODO TABLA MASIVA (múltiples registros)
      // ═══════════════════════════════════════════════════════════════════════
      } else {
        drawHeader();

        if (selectedType === 'summary') {
          const d = data.data;
          autoTable(doc, {
            startY: CONTENT_START,
            head: [['Métrica', 'Valor']],
            body: [
              ['Total Tickets',                    d.totalTickets],
              ['Tickets Abiertos',                 d.openTickets],
              ['Tickets Resueltos',                d.resolvedTickets],
              ['Total Actividades',                d.totalActivities],
              ['Actividades Completadas',          d.completedActivities],
              ['Total Activos en Inventario',      d.totalAssets],
              ['Total Clientes',                   d.totalClients],
              ['Tasa de Resolución (%)',           `${d.resolutionRate}%`],
              ['Tasa Completitud Actividades (%)', `${d.activityCompletionRate}%`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 10 },
            bodyStyles: { fontSize: 10 },
            alternateRowStyles: { fillColor: [239, 246, 255] },
            columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
            margin: { left: M, right: M },
          });

        } else if (rawRows.length > 0) {
          // Columnas optimizadas para hoja vertical por tipo
          const COLS: Partial<Record<ReportType, string[]>> = {
            tickets:     ['Número', 'Asunto', 'Estado', 'Prioridad', 'Cliente', 'Técnico asignado', 'Fecha creación'],
            actividades: ['Número', 'Descripción', 'Estado', 'Cliente', 'Técnico', 'Inicio', 'Fin', 'Minutos'],
            inventario:  ['Número', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Estado', 'Cliente'],
            tecnicos:    ['Técnico', 'Email', 'Total Tickets', 'Total Actividades', 'Horas trabajadas'],
            monthly:     ['Mes', 'Tickets creados', 'Tickets resueltos', 'Tasa de resolución (%)', 'Actividades', 'Actividades completadas'],
          };

          const flatRows = rawRows.map((r: any) => flattenRow(r, selectedType));
          const allKeys = Object.keys(flatRows[0] || {});
          const allowed = COLS[selectedType] || allKeys;
          const headers = allowed.filter(c => allKeys.includes(c));
          const body = flatRows.map(r => headers.map(h => String((r as any)[h] ?? '—')));

          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `${rawRows.length} registro${rawRows.length !== 1 ? 's' : ''}` +
            (filterNumero ? `  ·  Filtro: "${filterNumero}"` : '') +
            (dateFrom || dateTo ? `  ·  ${dateFrom || '—'} → ${dateTo || '—'}` : ''),
            M, CONTENT_START - 2,
          );

          autoTable(doc, {
            startY: CONTENT_START + 2,
            head: [headers],
            body,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
            bodyStyles: { fontSize: 8, cellPadding: 2.5 },
            alternateRowStyles: { fillColor: [239, 246, 255] },
            margin: { left: M, right: M, bottom: 18 },
            didDrawPage: (hookData: any) => {
              if (hookData.pageNumber > 1) {
                drawHeader();
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(`${rawRows.length} registros (continuación — pág. ${hookData.pageNumber})`, M, CONTENT_START - 2);
                doc.setTextColor(0, 0, 0);
              }
            },
          });
        }

        const pageCount = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          drawFooter(i, pageCount);
        }
      }

      doc.save(`GX-${selectedType}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exportado correctamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al exportar PDF');
    } finally {
      setGenerating(null);
    }
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const statusChartData = reportData?.ticketsByStatus?.map((s: any) => ({
    name: TICKET_STATUS_LABELS[s.status] || s.status,
    value: s._count,
  })) || [];

  const priorityChartData = reportData?.ticketsByPriority?.map((p: any) => ({
    name: PRIORITY_LABELS[p.priority] || p.priority,
    value: p._count,
  })) || [];

  const monthlyChartData = Array.isArray(reportData) && selectedType === 'monthly'
    ? reportData.map((m: any) => {
        const parts = m.mes.split(' ');
        const abbr = parts[0].substring(0, 3) + (parts[1] ? ` '${parts[1].substring(2)}` : '');
        return { mes: abbr, Tickets: m.tickets, Actividades: m.actividades, Resueltos: m.ticketsResueltos };
      })
    : [];

  // ── Shared preview table for individual reports ────────────────────────────
  const renderPreviewTable = (data: any[], type: ReportType) => {
    if (!data.length) return null;
    const flatSample = flattenRow(data[0], type);
    const headers = Object.keys(flatSample);
    const preview = data.slice(0, 20);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="section-title">{reportOptions.find(r => r.type === type)?.label}</h3>
          <span className="text-xs text-muted-foreground">{data.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {headers.map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.map((row: any, i: number) => {
                const flat = flattenRow(row, type);
                return (
                  <tr key={i} className="hover:bg-muted/20">
                    {Object.values(flat).map((val: any, j: number) => (
                      <td key={j} className="px-3 py-2 text-xs text-foreground max-w-[180px] truncate">
                        {String(val ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.length > 20 && (
            <div className="px-6 py-3 text-xs text-muted-foreground border-t border-border">
              Mostrando 20 de {data.length} registros. Exporta en Excel o PDF para ver todos.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y Analytics"
        description="Generación de reportes en PDF y Excel con filtros avanzados"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reportes' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tipo de reporte */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 shadow-card">
            <h3 className="text-sm font-semibold mb-3">Tipo de reporte</h3>
            <div className="space-y-2">
              {reportOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleSelectType(opt.type)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    selectedType === opt.type
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <opt.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedType === opt.type ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <div>
                    <p className={`text-xs font-medium ${selectedType === opt.type ? 'text-blue-700' : 'text-foreground'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de fechas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 shadow-card">
            <h3 className="text-sm font-semibold mb-3">Filtro de fechas</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                />
              </div>
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* Filtro por número de registro */}
          {hasNumeroFilter && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-4 shadow-card">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                Número de registro
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={filterNumero}
                  onChange={(e) => setFilterNumero(e.target.value)}
                  placeholder={NUMERO_PLACEHOLDER[selectedType] || 'Número de registro'}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Deja vacío para ver todos los registros.
                </p>
                {filterNumero && (
                  <button
                    onClick={() => setFilterNumero('')}
                    className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                  >
                    Limpiar número
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Botones de exportar */}
          <div className="space-y-2">
            <button
              onClick={handleExportPDF}
              disabled={!!generating}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!!generating}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Exportar Excel
            </button>
          </div>
        </div>

        {/* ── Content panel ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── SUMMARY ── */}
              {selectedType === 'summary' && reportData && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard title="Total tickets"  value={reportData.totalTickets}    icon={Ticket}  iconColor="text-blue-600"   iconBg="bg-blue-50" />
                    <StatCard title="Abiertos"        value={reportData.openTickets}     icon={Ticket}  iconColor="text-orange-600" iconBg="bg-orange-50" />
                    <StatCard title="Resueltos"       value={reportData.resolvedTickets} icon={Ticket}  iconColor="text-green-600"  iconBg="bg-green-50" />
                    <StatCard title="Activos"         value={reportData.totalAssets}     icon={Monitor} iconColor="text-purple-600" iconBg="bg-purple-50" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
                      <h3 className="section-title mb-4">Tickets por estado</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={statusChartData} barSize={12}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="value" name="Tickets" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
                      <h3 className="section-title mb-4">Tickets por prioridad</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={priorityChartData} barSize={12}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="value" name="Tickets" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-5">
                      <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Tasa de resolución</p>
                      <p className="text-4xl font-bold text-blue-600 mt-1">{reportData.resolutionRate}%</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-5">
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">Completitud actividades</p>
                      <p className="text-4xl font-bold text-green-600 mt-1">{reportData.activityCompletionRate}%</p>
                    </div>
                  </div>
                </>
              )}

              {/* ── MONTHLY ── */}
              {selectedType === 'monthly' && Array.isArray(reportData) && (
                <>
                  {/* Totales del período */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <StatCard
                      title="Tickets en período"
                      value={reportData.reduce((a: number, m: any) => a + m.tickets, 0)}
                      icon={Ticket} iconColor="text-blue-600" iconBg="bg-blue-50"
                    />
                    <StatCard
                      title="Tickets resueltos"
                      value={reportData.reduce((a: number, m: any) => a + m.ticketsResueltos, 0)}
                      icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50"
                    />
                    <StatCard
                      title="Total actividades"
                      value={reportData.reduce((a: number, m: any) => a + m.actividades, 0)}
                      icon={ClipboardList} iconColor="text-purple-600" iconBg="bg-purple-50"
                    />
                  </div>

                  {/* Gráfica de evolución */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-5 shadow-card">
                    <h3 className="section-title mb-4">Evolución mensual</h3>
                    {monthlyChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sin datos en el período seleccionado</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyChartData} barSize={9} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          <Bar dataKey="Tickets"     fill="#3B82F6" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Resueltos"   fill="#10B981" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Actividades" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Tabla mensual */}
                  {reportData.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-card overflow-hidden">
                      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <h3 className="section-title">Detalle por mes</h3>
                        <span className="text-xs text-muted-foreground">{reportData.length} meses</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border">
                              {Object.keys(flattenRow(reportData[0], 'monthly')).map((col) => (
                                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {reportData.map((row: any, i: number) => {
                              const flat = flattenRow(row, 'monthly');
                              const vals = Object.values(flat);
                              return (
                                <tr key={i} className="hover:bg-muted/20">
                                  {vals.map((val: any, j: number) => (
                                    <td key={j} className={`px-4 py-2.5 text-sm ${j === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                                      {j === 3 ? `${val}%` : val}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── INDIVIDUAL REPORTS (tickets, actividades, inventario, tecnicos) ── */}
              {['tickets', 'actividades', 'inventario', 'tecnicos'].includes(selectedType) &&
                Array.isArray(reportData) &&
                renderPreviewTable(reportData, selectedType)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
