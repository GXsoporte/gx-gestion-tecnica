import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifyClientOTP } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email, role: 'CLIENT', isActive: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No encontramos una cuenta con ese correo' },
        { status: 404 }
      );
    }

    // Genera OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Borra tokens previos para este email
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    // Crea nuevo token con 15 min de expiración
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Envía email con OTP
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await notifyClientOTP({ email, name: user.name, otp, appUrl });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('[send-otp] Error:', err);
    return NextResponse.json({ error: 'Error al enviar el código' }, { status: 500 });
  }
}
