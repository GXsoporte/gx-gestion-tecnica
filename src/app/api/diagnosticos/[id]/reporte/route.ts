import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter } from '@/lib/api-helpers';

const db = prisma as any;

function fmt(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtDt(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', SENT: 'Enviado', APPROVED: 'Aprobado',
  REJECTED: 'No aprobado', INFO_REQUESTED: 'Más información', COMPLETED: 'Completado',
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280', SENT: '#3b82f6', APPROVED: '#10b981',
  REJECTED: '#ef4444', INFO_REQUESTED: '#f59e0b', COMPLETED: '#8b5cf6',
};
const CRITICALITY_LABELS: Record<string, string> = {
  BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta', CRITICA: 'Crítica',
};
const CRITICALITY_COLORS: Record<string, string> = {
  BAJA: '#10b981', MEDIA: '#f59e0b', ALTA: '#f97316', CRITICA: '#ef4444',
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const diagnosis = await db.diagnosis.findFirst({
      where: { id: params.id, ...filter },
      include: {
        ticket:     { select: { ticketNumber: true, subject: true } },
        asset:      { select: { brand: true, model: true, serial: true, type: true } },
        client:     { select: { companyName: true, contactName: true, email: true, phone: true, address: true, city: true, nit: true } },
        technician: { select: { name: true, email: true } },
        company:    { select: { name: true, nit: true, email: true, phone: true, address: true, city: true } },
        solutions:  { select: { solutionNumber: true, status: true } },
      },
    });

    if (!diagnosis) return new NextResponse('Diagnóstico no encontrado', { status: 404 });

    const statusColor  = STATUS_COLORS[diagnosis.status]  ?? '#6b7280';
    const statusLabel  = STATUS_LABELS[diagnosis.status]  ?? diagnosis.status;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico ${diagnosis.diagnosisNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; }
    .print-bar { background: #1e293b; color: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .print-bar span { font-size: 14px; font-weight: 600; }
    .print-bar button { background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; }
    .print-bar button:hover { background: #1d4ed8; }
    .page { max-width: 820px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 36px 40px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .company-info { font-size: 12px; opacity: 0.65; margin-top: 4px; line-height: 1.7; }
    .doc-meta { text-align: right; }
    .doc-label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
    .doc-num { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #60a5fa; }
    .status-badge { display: inline-block; margin-top: 8px; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .header-bottom { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
    .ticket-ref { font-size: 13px; opacity: 0.75; }
    .ticket-ref strong { color: #93c5fd; }
    .body { padding: 36px 40px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
    .party-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; }
    .party-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px; }
    .party-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #64748b; line-height: 1.7; }
    .asset-bar { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .asset-bar .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #3b82f6; display: block; margin-bottom: 2px; }
    .asset-bar .val { font-size: 14px; font-weight: 600; color: #1e293b; }
    .section { margin-bottom: 24px; }
    .sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .content-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap; }
    .content-box.highlight { background: #fffbeb; border-color: #fde68a; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
    .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
    .kpi-val { font-size: 20px; font-weight: 800; }
    .repair-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1px solid #94a3b8; width: 75%; margin: 52px auto 10px; }
    .sig-label { font-size: 11px; color: #64748b; }
    .sig-name { font-weight: 600; font-size: 12px; margin-top: 4px; }
    .footer { border-top: 1px solid #f1f5f9; padding: 18px 40px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
    .footer p { font-size: 11px; color: #94a3b8; }
    @media print {
      .print-bar { display: none !important; }
      body { background: white; }
      .page { margin: 0; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span>Diagnóstico Técnico · ${diagnosis.diagnosisNumber}</span>
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </div>

  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="header-top">
        <div>
          <div class="company-name">${diagnosis.company?.name ?? 'GX Soporte'}</div>
          <div class="company-info">
            ${diagnosis.company?.nit ? `NIT: ${diagnosis.company.nit}<br>` : ''}
            ${diagnosis.company?.email ?? ''}${diagnosis.company?.phone ? ` · ${diagnosis.company.phone}` : ''}<br>
            ${diagnosis.company?.city ?? ''}${diagnosis.company?.address ? ` · ${diagnosis.company.address}` : ''}
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-label">Diagnóstico técnico</div>
          <div class="doc-num">${diagnosis.diagnosisNumber}</div>
          <div class="status-badge" style="background:${statusColor}25;color:${statusColor};border:1px solid ${statusColor}50;">
            ${statusLabel}
          </div>
        </div>
      </div>
      <div class="header-bottom">
        <div class="ticket-ref">
          Ticket: <strong>${diagnosis.ticket?.ticketNumber ?? '—'}</strong>
          &nbsp;·&nbsp; Asunto: <strong>${diagnosis.ticket?.subject ?? '—'}</strong>
          &nbsp;·&nbsp; Fecha: <strong>${fmt(diagnosis.createdAt)}</strong>
          ${diagnosis.sentAt ? `&nbsp;·&nbsp; Enviado: <strong>${fmt(diagnosis.sentAt)}</strong>` : ''}
          ${diagnosis.approvedAt ? `&nbsp;·&nbsp; Aprobado: <strong>${fmt(diagnosis.approvedAt)}</strong>` : ''}
        </div>
      </div>
    </div>

    <div class="body">
      <!-- Partes -->
      <div class="parties">
        <div class="party-card">
          <div class="party-title">Cliente</div>
          <div class="party-name">${diagnosis.client?.companyName ?? '—'}</div>
          <div class="party-detail">
            ${diagnosis.client?.nit ? `NIT: ${diagnosis.client.nit}<br>` : ''}
            ${diagnosis.client?.contactName ? `${diagnosis.client.contactName}<br>` : ''}
            ${diagnosis.client?.email ?? ''}
            ${diagnosis.client?.phone ? `<br>${diagnosis.client.phone}` : ''}
            ${diagnosis.client?.city ? `<br>${diagnosis.client.city}` : ''}
          </div>
        </div>
        <div class="party-card">
          <div class="party-title">Técnico responsable</div>
          <div class="party-name">${diagnosis.technician?.name ?? '—'}</div>
          <div class="party-detail">${diagnosis.technician?.email ?? ''}</div>
        </div>
      </div>

      <!-- Equipo -->
      <div class="asset-bar">
        <div>
          <span class="label">Equipo</span>
          <span class="val">${[diagnosis.asset?.brand, diagnosis.asset?.model].filter(Boolean).join(' ') || '—'}</span>
        </div>
        ${diagnosis.asset?.serial ? `<div><span class="label">Serial</span><span class="val" style="font-family:monospace">${diagnosis.asset.serial}</span></div>` : ''}
        ${diagnosis.asset?.type ? `<div><span class="label">Tipo</span><span class="val">${diagnosis.asset.type}</span></div>` : ''}
      </div>

      <!-- Descripción del problema -->
      ${diagnosis.description ? `
      <div class="section">
        <div class="sec-title">Descripción del problema</div>
        <div class="content-box">${diagnosis.description}</div>
      </div>` : ''}

      <!-- Causa -->
      ${diagnosis.problemCause ? `
      <div class="section">
        <div class="sec-title">Causa identificada</div>
        <div class="content-box">${diagnosis.problemCause}</div>
      </div>` : ''}

      <!-- Recomendación -->
      ${diagnosis.recommendation ? `
      <div class="section">
        <div class="sec-title">Recomendación técnica</div>
        <div class="content-box highlight">${diagnosis.recommendation}</div>
      </div>` : ''}

      <!-- Notas del técnico -->
      ${diagnosis.technicianNotes ? `
      <div class="section">
        <div class="sec-title">Notas del técnico</div>
        <div class="content-box">${diagnosis.technicianNotes}</div>
      </div>` : ''}

      <!-- KPIs -->
      <div class="section">
        <div class="sec-title">Resumen económico y operativo</div>
        <div class="grid3">
          ${diagnosis.estimatedCost != null ? `
          <div class="kpi-card">
            <div class="kpi-label">Costo estimado</div>
            <div class="kpi-val" style="color:#059669;">$${Number(diagnosis.estimatedCost).toLocaleString('es-CO')}</div>
          </div>` : ''}
          ${diagnosis.estimatedTime ? `
          <div class="kpi-card">
            <div class="kpi-label">Tiempo estimado</div>
            <div class="kpi-val" style="color:#2563eb;font-size:15px;">${diagnosis.estimatedTime}</div>
          </div>` : ''}
          <div class="kpi-card">
            <div class="kpi-label">Requiere reparación</div>
            <div class="kpi-val" style="font-size:15px;color:${diagnosis.requiresRepair ? '#f97316' : '#6b7280'};">
              ${diagnosis.requiresRepair ? 'Sí' : 'No'}
            </div>
          </div>
        </div>
      </div>

      <!-- Soluciones vinculadas -->
      ${diagnosis.solutions?.length ? `
      <div class="section">
        <div class="sec-title">Solución vinculada</div>
        <div class="content-box" style="background:#f0fdf4;border-color:#86efac;">
          ${diagnosis.solutions.map((s: any) => `✅ ${s.solutionNumber} — ${s.status === 'COMPLETED' ? 'Completada' : 'En proceso'}`).join('<br>')}
        </div>
      </div>` : ''}

      <!-- Firmas -->
      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Técnico responsable</div>
          <div class="sig-name">${diagnosis.technician?.name ?? ''}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Aprobación del cliente</div>
          <div class="sig-name">${diagnosis.client?.companyName ?? ''}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>${diagnosis.company?.name ?? 'GX Soporte'} · Sistema de Gestión Técnica</p>
      <p>Generado el ${fmtDt(new Date())} · Su aprobación autoriza el inicio de la reparación.</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e: any) {
    return new NextResponse(e.message || 'Error al generar reporte', { status: 500 });
  }
}
