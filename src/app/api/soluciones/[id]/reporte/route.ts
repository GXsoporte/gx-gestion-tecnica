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
  IN_PROGRESS: 'En proceso',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
};
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: '#3b82f6',
  COMPLETED:   '#10b981',
  CANCELLED:   '#ef4444',
};
const DELIVERY_LABELS: Record<string, string> = {
  PENDING:   'Pendiente entrega',
  DELIVERED: 'Entregado',
};
const DELIVERY_COLORS: Record<string, string> = {
  PENDING:   '#f59e0b',
  DELIVERED: '#10b981',
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);

    const solution = await db.solution.findFirst({
      where: { id: params.id, ...filter },
      include: {
        ticket:     { select: { ticketNumber: true, subject: true } },
        diagnosis:  { select: { diagnosisNumber: true, description: true } },
        asset:      { select: { brand: true, model: true, serial: true, type: true } },
        client:     { select: { companyName: true, contactName: true, email: true, phone: true, address: true, city: true, nit: true } },
        technician: { select: { name: true, email: true } },
        company:    { select: { name: true, nit: true, email: true, phone: true, address: true, city: true } },
      },
    });

    if (!solution) return new NextResponse('Solución no encontrada', { status: 404 });

    const statusColor   = STATUS_COLORS[solution.status]         ?? '#6b7280';
    const statusLabel   = STATUS_LABELS[solution.status]         ?? solution.status;
    const deliveryColor = DELIVERY_COLORS[solution.deliveryStatus] ?? '#6b7280';
    const deliveryLabel = DELIVERY_LABELS[solution.deliveryStatus] ?? solution.deliveryStatus;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solución ${solution.solutionNumber}</title>
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
    .content-box.highlight { background: #f0fdf4; border-color: #86efac; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
    .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
    .kpi-val { font-size: 20px; font-weight: 800; }
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
    <span>Solución Técnica · ${solution.solutionNumber}</span>
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </div>

  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="header-top">
        <div>
          <div class="company-name">${solution.company?.name ?? 'GX Soporte'}</div>
          <div class="company-info">
            ${solution.company?.nit ? `NIT: ${solution.company.nit}<br>` : ''}
            ${solution.company?.email ?? ''}${solution.company?.phone ? ` · ${solution.company.phone}` : ''}<br>
            ${solution.company?.city ?? ''}${solution.company?.address ? ` · ${solution.company.address}` : ''}
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-label">Solución técnica</div>
          <div class="doc-num">${solution.solutionNumber}</div>
          <div class="status-badge" style="background:${statusColor}25;color:${statusColor};border:1px solid ${statusColor}50;">
            ${statusLabel}
          </div>
          <br>
          <div class="status-badge" style="background:${deliveryColor}25;color:${deliveryColor};border:1px solid ${deliveryColor}50;margin-top:4px;">
            ${deliveryLabel}
          </div>
        </div>
      </div>
      <div class="header-bottom">
        <div class="ticket-ref">
          Ticket: <strong>${solution.ticket?.ticketNumber ?? '—'}</strong>
          &nbsp;·&nbsp; Asunto: <strong>${solution.ticket?.subject ?? '—'}</strong>
          &nbsp;·&nbsp; Fecha inicio: <strong>${fmt(solution.startDate || solution.createdAt)}</strong>
          ${solution.endDate ? `&nbsp;·&nbsp; Fecha fin: <strong>${fmt(solution.endDate)}</strong>` : ''}
          ${solution.diagnosis?.diagnosisNumber ? `&nbsp;·&nbsp; Diagnóstico: <strong>${solution.diagnosis.diagnosisNumber}</strong>` : ''}
        </div>
      </div>
    </div>

    <div class="body">
      <!-- Partes -->
      <div class="parties">
        <div class="party-card">
          <div class="party-title">Cliente</div>
          <div class="party-name">${solution.client?.companyName ?? '—'}</div>
          <div class="party-detail">
            ${solution.client?.nit ? `NIT: ${solution.client.nit}<br>` : ''}
            ${solution.client?.contactName ? `${solution.client.contactName}<br>` : ''}
            ${solution.client?.email ?? ''}
            ${solution.client?.phone ? `<br>${solution.client.phone}` : ''}
            ${solution.client?.city ? `<br>${solution.client.city}` : ''}
          </div>
        </div>
        <div class="party-card">
          <div class="party-title">Técnico responsable</div>
          <div class="party-name">${solution.technician?.name ?? '—'}</div>
          <div class="party-detail">${solution.technician?.email ?? ''}</div>
        </div>
      </div>

      <!-- Equipo -->
      <div class="asset-bar">
        <div>
          <span class="label">Equipo</span>
          <span class="val">${[solution.asset?.brand, solution.asset?.model].filter(Boolean).join(' ') || '—'}</span>
        </div>
        ${solution.asset?.serial ? `<div><span class="label">Serial</span><span class="val" style="font-family:monospace">${solution.asset.serial}</span></div>` : ''}
        ${solution.asset?.type ? `<div><span class="label">Tipo</span><span class="val">${solution.asset.type}</span></div>` : ''}
      </div>

      <!-- Diagnóstico vinculado -->
      ${solution.diagnosis?.diagnosisNumber ? `
      <div class="section">
        <div class="sec-title">Diagnóstico vinculado</div>
        <div class="content-box" style="background:#eff6ff;border-color:#bfdbfe;">
          ${solution.diagnosis.diagnosisNumber}${solution.diagnosis.description ? ` — ${solution.diagnosis.description}` : ''}
        </div>
      </div>` : ''}

      <!-- Actividades realizadas -->
      ${solution.activitiesDone ? `
      <div class="section">
        <div class="sec-title">Actividades realizadas</div>
        <div class="content-box">${solution.activitiesDone}</div>
      </div>` : ''}

      <!-- Repuestos utilizados -->
      ${solution.spareParts ? `
      <div class="section">
        <div class="sec-title">Repuestos utilizados</div>
        <div class="content-box">${solution.spareParts}</div>
      </div>` : ''}

      <!-- Software instalado -->
      ${solution.installedSoftware ? `
      <div class="section">
        <div class="sec-title">Software instalado</div>
        <div class="content-box">${solution.installedSoftware}</div>
      </div>` : ''}

      <!-- Configuraciones aplicadas -->
      ${solution.configurations ? `
      <div class="section">
        <div class="sec-title">Configuraciones aplicadas</div>
        <div class="content-box">${solution.configurations}</div>
      </div>` : ''}

      <!-- Pruebas realizadas -->
      ${solution.testsDone ? `
      <div class="section">
        <div class="sec-title">Pruebas realizadas</div>
        <div class="content-box">${solution.testsDone}</div>
      </div>` : ''}

      <!-- Resultado final -->
      ${solution.finalResult ? `
      <div class="section">
        <div class="sec-title">Resultado final</div>
        <div class="content-box highlight">${solution.finalResult}</div>
      </div>` : ''}

      <!-- Recomendaciones -->
      ${solution.recommendations ? `
      <div class="section">
        <div class="sec-title">Recomendaciones al cliente</div>
        <div class="content-box highlight">${solution.recommendations}</div>
      </div>` : ''}

      <!-- Fechas -->
      <div class="section">
        <div class="sec-title">Resumen operativo</div>
        <div class="grid3">
          <div class="kpi-card">
            <div class="kpi-label">Estado</div>
            <div class="kpi-val" style="font-size:13px;color:${statusColor};">${statusLabel}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Entrega</div>
            <div class="kpi-val" style="font-size:13px;color:${deliveryColor};">${deliveryLabel}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Fecha fin</div>
            <div class="kpi-val" style="font-size:13px;color:#1e293b;">${fmt(solution.endDate)}</div>
          </div>
        </div>
      </div>

      <!-- Firmas -->
      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Técnico responsable</div>
          <div class="sig-name">${solution.technician?.name ?? ''}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Recibido por el cliente</div>
          <div class="sig-name">${solution.client?.companyName ?? ''}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>${solution.company?.name ?? 'GX Soporte'} · Sistema de Gestión Técnica</p>
      <p>Generado el ${fmtDt(new Date())} · Su firma confirma la recepción del equipo.</p>
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
