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

    let clientId: string | null = null;

    const client = await prisma.client.findFirst({ where: { email } });
    if (client) {
      clientId = client.id;
    } else {
      const clientUser = await (prisma as any).clientUser.findFirst({ where: { email1: email } });
      if (clientUser) clientId = clientUser.clientId;
    }

    if (!clientId) return NextResponse.json({ data: [] });

    const solutions = await prisma.solution.findMany({
      where: { clientId },
      include: {
        ticket: { select: { ticketNumber: true, subject: true } },
        diagnosis: { select: { diagnosisNumber: true } },
        asset: { select: { brand: true, model: true, assetNumber: true } },
        technician: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: solutions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
