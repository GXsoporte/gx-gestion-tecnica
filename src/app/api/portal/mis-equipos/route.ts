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

    const clientUser = await (prisma as any).clientUser.findFirst({
      where: { email1: email },
      include: {
        assets: {
          select: {
            id: true,
            assetNumber: true,
            type: true,
            brand: true,
            model: true,
            serial: true,
            processor: true,
            ram: true,
            storage: true,
            operatingSystem: true,
            status: true,
            area: true,
            location: true,
          },
        },
      },
    });

    if (!clientUser) return NextResponse.json({ data: [] });

    return NextResponse.json({ data: clientUser.assets ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
