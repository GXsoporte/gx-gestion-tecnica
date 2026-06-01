import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const email = session.user.email;
    if (!email) return NextResponse.json({ data: [] });

    const client = await prisma.client.findFirst({ where: { email } });

    if (!client) {
      // Try via ClientUser
      const clientUser = await (prisma as any).clientUser.findFirst({ where: { email1: email } });
      if (!clientUser) return NextResponse.json({ data: [] });

      const tickets = await prisma.ticket.findMany({
        where: { clientId: clientUser.clientId },
        include: {
          client: { select: { companyName: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ data: tickets });
    }

    const tickets = await prisma.ticket.findMany({
      where: { clientId: client.id },
      include: {
        client: { select: { companyName: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: tickets });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
