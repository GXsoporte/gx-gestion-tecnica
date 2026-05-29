import nodemailer from 'nodemailer';

// ─── Transporter (Apple / iCloud SMTP) ───────────────────────────────────────
// Para iCloud usa una App-Specific Password generada en:
// appleid.apple.com → Sign-In and Security → App-Specific Passwords
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mail.me.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: { rejectUnauthorized: false },
});

// ─── Destinatarios fijos ──────────────────────────────────────────────────────
const SUPPORT_EMAIL = process.env.NOTIFY_EMAIL || 'soporte@gibux.com.co';

// ─── Email: Nuevo ticket ──────────────────────────────────────────────────────
export async function notifyNewTicket(ticket: {
  ticketNumber: string;
  subject: string;
  description: string;
  priority: string;
  type: string;
  requesterName: string;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  clientName?: string;
  companyName?: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[notifications] SMTP_USER / SMTP_PASS no configurados — email omitido');
    return;
  }

  const PRIORITY_LABELS: Record<string, string> = {
    LOW: '🟢 Baja',
    MEDIUM: '🟡 Media',
    HIGH: '🟠 Alta',
    CRITICAL: '🔴 Crítica',
  };

  const TYPE_LABELS: Record<string, string> = {
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

  const priority = PRIORITY_LABELS[ticket.priority] || ticket.priority;
  const type = TYPE_LABELS[ticket.type] || ticket.type;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#2563eb;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
              🎫 Nuevo Ticket Creado
            </h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">
              ${ticket.companyName || 'GX Soporte'}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <!-- Ticket number badge -->
            <div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 14px;margin-bottom:24px;">
              <span style="color:#1d4ed8;font-weight:700;font-size:15px;">${ticket.ticketNumber}</span>
            </div>

            <h2 style="margin:0 0 8px;font-size:18px;color:#1e293b;">${ticket.subject}</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">${ticket.description}</p>

            <!-- Info grid -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f8fafc;">
                <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;width:40%;">Prioridad</td>
                <td style="padding:12px 16px;font-size:14px;color:#1e293b;font-weight:600;border-bottom:1px solid #e2e8f0;">${priority}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;">Tipo</td>
                <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${type}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;">Solicitante</td>
                <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${ticket.requesterName}</td>
              </tr>
              ${ticket.requesterEmail ? `
              <tr>
                <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;">Email</td>
                <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${ticket.requesterEmail}</td>
              </tr>` : ''}
              ${ticket.requesterPhone ? `
              <tr style="background:#f8fafc;">
                <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0;">Teléfono</td>
                <td style="padding:12px 16px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${ticket.requesterPhone}</td>
              </tr>` : ''}
              ${ticket.clientName ? `
              <tr>
                <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Cliente</td>
                <td style="padding:12px 16px;font-size:14px;color:#1e293b;">${ticket.clientName}</td>
              </tr>` : ''}
            </table>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${appUrl}/tickets"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:15px;">
                Ver ticket en el sistema
              </a>
            </div>

            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Este es un mensaje automático generado por GX Soporte.<br/>
              Por favor no respondas directamente a este correo.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              GX Soporte · ${new Date().getFullYear()}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `
Nuevo Ticket: ${ticket.ticketNumber}
Asunto: ${ticket.subject}
Prioridad: ${priority}
Tipo: ${type}
Solicitante: ${ticket.requesterName}
${ticket.requesterEmail ? `Email: ${ticket.requesterEmail}` : ''}
${ticket.requesterPhone ? `Teléfono: ${ticket.requesterPhone}` : ''}
${ticket.clientName ? `Cliente: ${ticket.clientName}` : ''}

Descripción:
${ticket.description}

Ver en el sistema: ${appUrl}/tickets
`.trim();

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '';

  try {
    await transporter.sendMail({
      from: `"GX Soporte" <${fromAddress}>`,
      to: SUPPORT_EMAIL,
      subject: `[${ticket.ticketNumber}] ${ticket.subject} — ${priority}`,
      text,
      html,
    });
    console.log(`[notifications] Email enviado a ${SUPPORT_EMAIL} para ticket ${ticket.ticketNumber}`);
  } catch (err) {
    console.error('[notifications] Error al enviar email:', err);
    // No lanzamos el error — la creación del ticket no debe fallar por esto
  }
}
