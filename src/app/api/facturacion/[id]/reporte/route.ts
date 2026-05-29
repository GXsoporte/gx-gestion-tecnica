import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiError } from '@/lib/api-helpers';

const db = prisma as any;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SENT: '#3b82f6',
  PAID: '#10b981',
  OVERDUE: '#ef4444',
  CANCELLED: '#9ca3af',
};

function fmt(n: number, currency = 'COP') {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const companyId = session.user.companyId;
    if (!companyId) return apiError('Sin empresa asignada', 403);

    const invoice = await db.invoice.findFirst({
      where: { id: params.id, companyId },
      include: {
        client: true,
        items: true,
        company: { select: { name: true, nit: true, email: true, phone: true, address: true, city: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!invoice) return apiError('Factura no encontrada', 404);

    const statusColor = STATUS_COLORS[invoice.status] || '#6b7280';
    const statusLabel = STATUS_LABELS[invoice.status] || invoice.status;

    const itemRows = invoice.items.map((item: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(item.unitPrice, invoice.currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(item.total, invoice.currency)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; }
    .print-bar { background: #1e293b; color: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .print-bar button { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; }
    .print-bar button:hover { background: #2563eb; }
    .page { max-width: 800px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 36px 40px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .company-info { font-size: 13px; opacity: 0.7; margin-top: 4px; line-height: 1.6; }
    .invoice-meta { text-align: right; }
    .invoice-num { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #60a5fa; }
    .invoice-label { font-size: 12px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
    .status-badge { display: inline-block; margin-top: 8px; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 40px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .party-card { background: #f8fafc; border-radius: 10px; padding: 20px; }
    .party-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
    .party-name { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .party-detail { font-size: 13px; color: #64748b; line-height: 1.6; }
    .dates-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .date-card { background: #f8fafc; border-radius: 10px; padding: 16px; text-align: center; }
    .date-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
    .date-value { font-size: 14px; font-weight: 600; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #f1f5f9; }
    th { padding: 12px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    th:last-child, th:nth-child(2), th:nth-child(3) { text-align: right; }
    th:nth-child(2) { text-align: center; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; border-bottom: 1px solid #f1f5f9; }
    .totals-row.total { font-size: 20px; font-weight: 800; color: #1e293b; border-bottom: none; padding-top: 12px; }
    .notes { background: #f8fafc; border-radius: 10px; padding: 20px; margin-top: 24px; }
    .notes-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
    .notes-text { font-size: 13px; color: #475569; line-height: 1.6; }
    .footer { border-top: 1px solid #f1f5f9; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
    .footer-text { font-size: 12px; color: #94a3b8; }
    @media print {
      .print-bar { display: none !important; }
      body { background: white; }
      .page { margin: 0; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span style="font-size:14px;font-weight:600;">Factura ${invoice.invoiceNumber}</span>
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div>
          <div class="company-name">${invoice.company.name}</div>
          <div class="company-info">
            ${invoice.company.nit ? `NIT: ${invoice.company.nit}<br>` : ''}
            ${invoice.company.email || ''}${invoice.company.phone ? ` · ${invoice.company.phone}` : ''}<br>
            ${invoice.company.city || ''}${invoice.company.address ? ` · ${invoice.company.address}` : ''}
          </div>
        </div>
        <div class="invoice-meta">
          <div class="invoice-label">Factura</div>
          <div class="invoice-num">${invoice.invoiceNumber}</div>
          <div class="status-badge" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;">
            ${statusLabel}
          </div>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="parties">
        <div class="party-card">
          <div class="party-title">Empresa emisora</div>
          <div class="party-name">${invoice.company.name}</div>
          <div class="party-detail">
            ${invoice.company.nit ? `NIT: ${invoice.company.nit}<br>` : ''}
            ${invoice.company.email || ''}<br>${invoice.company.phone || ''}
          </div>
        </div>
        <div class="party-card">
          <div class="party-title">Facturar a</div>
          <div class="party-name">${invoice.client.companyName}</div>
          <div class="party-detail">
            ${invoice.client.nit ? `NIT: ${invoice.client.nit}<br>` : ''}
            ${invoice.client.contactName}<br>
            ${invoice.client.email}<br>
            ${invoice.client.phone || ''}${invoice.client.city ? `<br>${invoice.client.city}` : ''}
          </div>
        </div>
      </div>

      <div class="dates-row">
        <div class="date-card">
          <div class="date-label">Fecha de emisión</div>
          <div class="date-value">${fmtDate(invoice.issueDate)}</div>
        </div>
        <div class="date-card">
          <div class="date-label">Fecha de vencimiento</div>
          <div class="date-value" style="${invoice.status === 'OVERDUE' ? 'color:#ef4444;' : ''}">${fmtDate(invoice.dueDate)}</div>
        </div>
        <div class="date-card">
          <div class="date-label">Moneda</div>
          <div class="date-value">${invoice.currency}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:50%">Descripción</th>
            <th style="width:12%;text-align:center;">Cant.</th>
            <th style="width:19%;text-align:right;">Precio unit.</th>
            <th style="width:19%;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${fmt(invoice.subtotal, invoice.currency)}</span>
        </div>
        <div class="totals-row">
          <span>IVA (${invoice.taxRate}%)</span>
          <span>${fmt(invoice.taxAmount, invoice.currency)}</span>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <span>${fmt(invoice.total, invoice.currency)}</span>
        </div>
      </div>

      ${invoice.notes ? `
      <div class="notes">
        <div class="notes-title">Notas</div>
        <div class="notes-text">${invoice.notes}</div>
      </div>` : ''}

      ${invoice.terms ? `
      <div class="notes" style="margin-top:12px;">
        <div class="notes-title">Términos y condiciones</div>
        <div class="notes-text">${invoice.terms}</div>
      </div>` : ''}
    </div>

    <div class="footer">
      <div class="footer-text">Generado por GX Soporte · ${new Date().toLocaleDateString('es-CO')}</div>
      <div class="footer-text">Creado por: ${invoice.createdBy.name}</div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
