import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const email = session.user.email;
    if (!email) return NextResponse.json({ error: 'Sin email en sesión' }, { status: 400 });

    // Buscar Client por email principal
    const client = await prisma.client.findFirst({
      where: { email },
      select: { id: true, companyName: true, email: true },
    });

    if (client) {
      return NextResponse.json({ data: { id: client.id, companyName: client.companyName, email: client.email } });
    }

    // Buscar por ClientUser.email1
    const clientUser = await (prisma as any).clientUser.findFirst({
      where: { email1: email },
      select: { id: true, clientId: true, name: true },
    });

    if (clientUser) {
      return NextResponse.json({ data: { clientId: clientUser.clientId, clientUserId: clientUser.id } });
    }

    return NextResponse.json({ data: null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
