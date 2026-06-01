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

// ─── Email: Diagnóstico al cliente ───────────────────────────────────────────
export async function notifyDiagnosisToClient(params: {
  diagnosisNumber: string;
  clientName: string;
  clientEmail: string;
  technicianName: string;
  ticketNumber: string;
  ticketSubject: string;
  assetInfo: string;
  description: string;
  problemCause?: string;
  recommendation?: string;
  estimatedCost?: number | null;
  estimatedTime?: string;
  requiresRepair: boolean;
  appUrl: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[notifications] SMTP no configurado — email omitido');
    return;
  }

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr><td style="background:#0f766e;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">🔬 Diagnóstico Técnico</h1>
    <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">${params.clientName}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <span style="color:#15803d;font-weight:700;font-size:15px;">${params.diagnosisNumber}</span>
      <span style="color:#64748b;font-size:13px;margin-left:12px;">Ticket: ${params.ticketNumber}</span>
    </div>

    <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1e293b;">${params.ticketSubject}</p>
    <p style="margin:0 0 24px;font-size:13px;color:#64748b;">Equipo: <strong>${params.assetInfo}</strong> · Técnico: <strong>${params.technicianName}</strong></p>

    <!-- Descripción -->
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Descripción del problema</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;background:#f8fafc;border-left:3px solid #0f766e;padding:10px 14px;border-radius:0 6px 6px 0;">${params.description}</p>
    </div>

    ${params.problemCause ? `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Causa identificada</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;">${params.problemCause}</p>
    </div>` : ''}

    ${params.recommendation ? `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Recomendación</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;">${params.recommendation}</p>
    </div>` : ''}

    <!-- Estimados -->
    ${(params.estimatedCost || params.estimatedTime) ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      ${params.estimatedCost ? `
      <tr style="background:#f8fafc;">
        <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;width:40%;">Costo estimado</td>
        <td style="padding:12px 16px;font-size:15px;color:#15803d;font-weight:700;">$${Number(params.estimatedCost).toLocaleString('es-CO')}</td>
      </tr>` : ''}
      ${params.estimatedTime ? `
      <tr>
        <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Tiempo estimado</td>
        <td style="padding:12px 16px;font-size:14px;color:#1e293b;font-weight:600;">${params.estimatedTime}</td>
      </tr>` : ''}
      <tr style="${params.estimatedCost || params.estimatedTime ? 'background:#f8fafc;' : ''}">
        <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">¿Requiere reparación?</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:700;color:${params.requiresRepair ? '#ea580c' : '#16a34a'};">${params.requiresRepair ? 'Sí' : 'No'}</td>
      </tr>
    </table>` : ''}

    <!-- CTA -->
    <p style="margin:0 0 16px;font-size:14px;color:#475569;text-align:center;">
      Por favor revise el diagnóstico y tome una decisión:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center" style="padding:0 8px;">
          <a href="${params.appUrl}/diagnosticos"
             style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">
            ✅ Aprobar diagnóstico
          </a>
        </td>
        <td align="center" style="padding:0 8px;">
          <a href="${params.appUrl}/diagnosticos"
             style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">
            ✗ No aprobar
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Para aprobar o rechazar el diagnóstico, ingrese a la plataforma GX Soporte con sus credenciales.<br/>
      Este es un mensaje automático — no responda a este correo.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">GX Soporte · ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  try {
    await transporter.sendMail({
      from: `"GX Soporte" <${from}>`,
      to: params.clientEmail,
      subject: `[Diagnóstico ${params.diagnosisNumber}] ${params.ticketSubject} — Su aprobación requerida`,
      html,
    });
    console.log(`[notifications] Diagnóstico ${params.diagnosisNumber} enviado a ${params.clientEmail}`);
  } catch (err) {
    console.error('[notifications] Error al enviar diagnóstico:', err);
    throw err; // Re-lanzamos para informar al usuario
  }
}

// ─── Email: Solución completada al cliente ───────────────────────────────────
export async function notifySolutionToClient(params: {
  solutionNumber: string;
  clientName: string;
  clientEmail: string;
  technicianName: string;
  ticketNumber: string;
  ticketSubject: string;
  assetInfo: string;
  activitiesDone?: string;
  finalResult?: string;
  recommendations?: string;
  appUrl: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[notifications] SMTP no configurado — email omitido');
    return;
  }

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr><td style="background:#16a34a;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">🔧 Solución Técnica Completada</h1>
    <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">${params.clientName}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <span style="color:#15803d;font-weight:700;font-size:15px;">${params.solutionNumber}</span>
      <span style="color:#64748b;font-size:13px;margin-left:12px;">Ticket: ${params.ticketNumber}</span>
    </div>

    <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1e293b;">${params.ticketSubject}</p>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;">Equipo: <strong>${params.assetInfo}</strong> · Técnico: <strong>${params.technicianName}</strong></p>

    <p style="margin:0 0 24px;font-size:14px;color:#16a34a;font-weight:600;">
      Su equipo ha sido reparado. A continuación el resumen de la solución aplicada.
    </p>

    ${params.activitiesDone ? `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Actividades realizadas</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;background:#f8fafc;border-left:3px solid #16a34a;padding:10px 14px;border-radius:0 6px 6px 0;">${params.activitiesDone}</p>
    </div>` : ''}

    ${params.finalResult ? `
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Resultado final</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;">${params.finalResult}</p>
    </div>` : ''}

    ${params.recommendations ? `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Recomendaciones</p>
      <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;">${params.recommendations}</p>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${params.appUrl}/soluciones"
         style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        Ver solución en el sistema
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Este es un mensaje automático — no responda a este correo.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">GX Soporte · ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  try {
    await transporter.sendMail({
      from: `"GX Soporte" <${from}>`,
      to: params.clientEmail,
      subject: `[Solución ${params.solutionNumber}] ${params.ticketSubject} — Su equipo ha sido reparado`,
      html,
    });
    console.log(`[notifications] Solución ${params.solutionNumber} enviada a ${params.clientEmail}`);
  } catch (err) {
    console.error('[notifications] Error al enviar solución:', err);
    throw err;
  }
}

// ─── Email: Credenciales de acceso al portal ────────────────────────────────
export async function notifyClientCredentials(params: {
  name: string;
  email: string;
  rawPassword: string;
  appUrl: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[notifications] SMTP no configurado — email omitido');
    return;
  }

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr><td style="background:#1e293b;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Bienvenido al portal de soporte</h1>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">Sus credenciales de acceso</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#1e293b;">Hola, <strong>${params.name}</strong></p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Su cuenta en el portal de soporte ha sido creada exitosamente. A continuación encontrará sus credenciales de acceso:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#f8fafc;">
        <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;width:40%;">Email</td>
        <td style="padding:12px 16px;font-size:14px;color:#1e293b;font-weight:600;">${params.email}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Contraseña temporal</td>
        <td style="padding:12px 16px;font-size:15px;color:#0f766e;font-weight:700;font-family:monospace;">${params.rawPassword}</td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;">
      Puede cambiar su contraseña desde su perfil una vez ingrese al sistema.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${params.appUrl}/login"
         style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        Ingresar al portal
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Este es un mensaje automático — no responda a este correo.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">GX Soporte · ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  try {
    await transporter.sendMail({
      from: `"GX Soporte" <${from}>`,
      to: params.email,
      subject: 'Bienvenido al portal de soporte — Sus credenciales de acceso',
      html,
    });
    console.log(`[notifications] Credenciales enviadas a ${params.email}`);
  } catch (err) {
    console.error('[notifications] Error al enviar credenciales:', err);
    throw err;
  }
}

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

// ─── Email: OTP de acceso para clientes ─────────────────────────────────────
export async function notifyClientOTP(params: {
  email: string;
  name: string;
  otp: string;
  appUrl: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[notifications] SMTP no configurado — email omitido');
    return;
  }

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr><td style="background:#1e293b;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Tu código de acceso</h1>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">GX Soporte</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#1e293b;">Hola, <strong>${params.name}</strong></p>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Usa el siguiente código para ingresar al portal de soporte:
    </p>

    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:20px 40px;">
        <span style="font-size:36px;font-weight:700;color:#60a5fa;letter-spacing:8px;font-family:monospace;">${params.otp}</span>
      </div>
    </div>

    <p style="margin:0 0 24px;font-size:13px;color:#64748b;text-align:center;">
      Este código expira en <strong>15 minutos</strong>. No lo compartas con nadie.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${params.appUrl}/login"
         style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">
        Ir al portal
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Si no solicitaste este código, ignora este mensaje.<br/>
      Este es un mensaje automático — no responda a este correo.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">GX Soporte · ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  try {
    await transporter.sendMail({
      from: `"GX Soporte" <${from}>`,
      to: params.email,
      subject: 'Tu código de acceso — GX Soporte',
      html,
    });
    console.log(`[notifications] OTP enviado a ${params.email}`);
  } catch (err) {
    console.error('[notifications] Error al enviar OTP:', err);
    throw err;
  }
}
