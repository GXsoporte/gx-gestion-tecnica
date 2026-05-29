import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';

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

const TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'Preventivo', CORRECTIVE: 'Correctivo', PREDICTIVE: 'Predictivo',
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Programado', IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado', OVERDUE: 'Vencido',
};
const STATUS_BADGE: Record<string, string> = {
  COMPLETED: '#dcfce7;color:#15803d', IN_PROGRESS: '#fef9c3;color:#a16207',
  CANCELLED: '#f1f5f9;color:#475569', OVERDUE: '#fee2e2;color:#dc2626',
  SCHEDULED: '#dbeafe;color:#1d4ed8',
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const companyFilter = session.user.role === 'SUPER_ADMIN' ? {} : { companyId: session.user.companyId! };

    const maintenance = await prisma.maintenance.findFirst({
      where: { id: params.id, ...companyFilter },
      include: {
        client:     { select: { companyName: true, address: true, phone: true, email: true } },
        asset:      { select: { brand: true, model: true, serial: true, type: true } },
        technician: { select: { name: true, email: true } },
        company:    { select: { name: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!maintenance) return new NextResponse('No encontrado', { status: 404 });

    const activity = await (prisma.activity as any).findFirst({
      where: { maintenanceId: params.id },
      select: {
        activityNumber: true, status: true,
        diagnosis: true, solution: true,
        startTime: true, endTime: true, totalMinutes: true,
      },
    });

    const images = maintenance.attachments.filter((a) => a.mimeType.startsWith('image/'));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Reporte — ${maintenance.title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff}
    .page{max-width:820px;margin:0 auto;padding:40px 36px}
    .topbar{background:#1e293b;padding:12px 36px;display:flex;justify-content:space-between;align-items:center}
    .topbar span{color:#94a3b8;font-size:13px}
    .topbar button{background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #2563eb;margin-bottom:24px}
    .logo h1{font-size:22px;font-weight:800;color:#2563eb}
    .logo p{font-size:11px;color:#64748b;margin-top:2px}
    .meta{text-align:right}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
    .meta p{font-size:11px;color:#94a3b8;margin-top:6px}
    .title-block{margin-bottom:22px}
    .title-block h2{font-size:20px;font-weight:700;color:#0f172a}
    .title-block .sub{color:#64748b;font-size:12px;margin-top:4px}
    .section{margin-bottom:20px}
    .sec-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:10px}
    .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
    .field label{font-size:11px;color:#94a3b8;font-weight:500;display:block;margin-bottom:2px}
    .field p{font-size:13px;color:#0f172a;font-weight:500}
    .text-body{font-size:13px;line-height:1.65;color:#334155;white-space:pre-wrap}
    .act-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px}
    .act-num{font-size:15px;font-weight:700;color:#1d4ed8;font-family:monospace}
    .img-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
    .img-grid img{width:175px;height:135px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0}
    .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0}
    .sig-box{text-align:center}
    .sig-line{border-top:1px solid #334155;width:80%;margin:48px auto 8px}
    .sig-label{font-size:11px;color:#64748b}
    .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between}
    .footer p{font-size:10px;color:#94a3b8}
    @media print{.topbar{display:none!important}body{font-size:12px}.page{padding:20px 24px}}
  </style>
</head>
<body>
  <div class="topbar">
    <span>Vista previa del reporte de mantenimiento</span>
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>

  <div class="page">
    <div class="header">
      <div class="logo">
        <h1>GX Soporte</h1>
        <p>Gestión Técnica · ${maintenance.company?.name ?? ''}</p>
      </div>
      <div class="meta">
        <span class="badge" style="background:${(STATUS_BADGE[maintenance.status] ?? '#dbeafe;color:#1d4ed8').split(';')[0]};color:${(STATUS_BADGE[maintenance.status] ?? 'color:#1d4ed8').split('color:')[1]}">
          ${STATUS_LABELS[maintenance.status]}
        </span>
        <p>Generado: ${fmtDt(new Date())}</p>
      </div>
    </div>

    <div class="title-block">
      <h2>${maintenance.title}</h2>
      <p class="sub">Tipo: ${TYPE_LABELS[maintenance.type] ?? maintenance.type} &nbsp;·&nbsp; Programado: ${fmt(maintenance.scheduledDate)}${maintenance.completedDate ? ` &nbsp;·&nbsp; Completado: ${fmtDt(maintenance.completedDate)}` : ''}</p>
    </div>

    <div class="section">
      <div class="sec-title">Información general</div>
      <div class="grid2">
        <div class="card">
          <div style="font-weight:700;font-size:12px;color:#475569;margin-bottom:10px">Cliente</div>
          <div class="grid2" style="gap:8px">
            <div class="field"><label>Empresa</label><p>${maintenance.client?.companyName ?? '—'}</p></div>
            ${maintenance.client?.phone ? `<div class="field"><label>Teléfono</label><p>${maintenance.client.phone}</p></div>` : ''}
            ${maintenance.client?.email ? `<div class="field"><label>Correo</label><p style="font-size:12px">${maintenance.client.email}</p></div>` : ''}
            ${maintenance.client?.address ? `<div class="field"><label>Dirección</label><p>${maintenance.client.address}</p></div>` : ''}
          </div>
        </div>
        <div class="card">
          <div style="font-weight:700;font-size:12px;color:#475569;margin-bottom:10px">Técnico responsable</div>
          <div class="field"><label>Nombre</label><p>${maintenance.technician?.name ?? '—'}</p></div>
          ${maintenance.technician?.email ? `<div class="field" style="margin-top:8px"><label>Correo</label><p>${maintenance.technician.email}</p></div>` : ''}
        </div>
      </div>
    </div>

    ${maintenance.asset ? `
    <div class="section">
      <div class="sec-title">Equipo intervenido</div>
      <div class="card">
        <div class="grid3">
          <div class="field"><label>Marca</label><p>${maintenance.asset.brand}</p></div>
          <div class="field"><label>Modelo</label><p>${maintenance.asset.model}</p></div>
          ${maintenance.asset.serial ? `<div class="field"><label>Serial</label><p style="font-family:monospace">${maintenance.asset.serial}</p></div>` : ''}
          ${(maintenance.asset as any).type ? `<div class="field"><label>Tipo</label><p>${(maintenance.asset as any).type}</p></div>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="sec-title">Fechas y tiempos</div>
      <div class="card">
        <div class="grid3">
          <div class="field"><label>Programado</label><p>${fmt(maintenance.scheduledDate)}</p></div>
          <div class="field"><label>Completado</label><p>${fmtDt(maintenance.completedDate)}</p></div>
          <div class="field"><label>Duración (min)</label><p>${maintenance.duration ?? '—'}</p></div>
          ${maintenance.nextDate ? `<div class="field"><label>Próximo</label><p>${fmt(maintenance.nextDate)}</p></div>` : ''}
        </div>
      </div>
    </div>

    ${maintenance.description ? `
    <div class="section">
      <div class="sec-title">Descripción</div>
      <div class="card"><p class="text-body">${maintenance.description}</p></div>
    </div>` : ''}

    ${maintenance.notes ? `
    <div class="section">
      <div class="sec-title">Notas técnicas</div>
      <div class="card"><p class="text-body">${maintenance.notes}</p></div>
    </div>` : ''}

    ${activity ? `
    <div class="section">
      <div class="sec-title">Actividad técnica</div>
      <div class="act-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span class="act-num">${activity.activityNumber}</span>
          <span class="badge" style="background:#dbeafe;color:#1d4ed8;font-size:10px">${activity.status}</span>
        </div>
        ${activity.diagnosis ? `<div style="margin-bottom:10px"><div class="sec-title" style="margin-bottom:4px">Diagnóstico</div><p class="text-body">${activity.diagnosis}</p></div>` : ''}
        ${activity.solution ? `<div><div class="sec-title" style="margin-bottom:4px">Solución aplicada</div><p class="text-body">${activity.solution}</p></div>` : ''}
        ${(activity.startTime || activity.endTime) ? `
        <div style="display:flex;gap:24px;margin-top:12px">
          ${activity.startTime ? `<div class="field"><label>Inicio</label><p>${fmtDt(activity.startTime)}</p></div>` : ''}
          ${activity.endTime ? `<div class="field"><label>Fin</label><p>${fmtDt(activity.endTime)}</p></div>` : ''}
          ${activity.totalMinutes ? `<div class="field"><label>Total</label><p>${activity.totalMinutes} min</p></div>` : ''}
        </div>` : ''}
      </div>
    </div>` : ''}

    ${images.length > 0 ? `
    <div class="section">
      <div class="sec-title">Fotografías (${images.length})</div>
      <div class="img-grid">
        ${images.map((img) => `<img src="${baseUrl}${img.url}" alt="${img.originalName}" />`).join('')}
      </div>
    </div>` : ''}

    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line"></div>
        <p class="sig-label">Técnico responsable</p>
        <p style="font-weight:600;font-size:12px;margin-top:4px">${maintenance.technician?.name ?? ''}</p>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <p class="sig-label">Representante del cliente</p>
        <p style="font-weight:600;font-size:12px;margin-top:4px">${maintenance.client?.companyName ?? ''}</p>
      </div>
    </div>

    <div class="footer">
      <p>GX Soporte · Sistema de Gestión Técnica</p>
      <p>Generado el ${fmtDt(new Date())} · ${maintenance.company?.name ?? ''}</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e: any) {
    return new NextResponse(e.message || 'Error al generar reporte', { status: e.statusCode || 500 });
  }
}
