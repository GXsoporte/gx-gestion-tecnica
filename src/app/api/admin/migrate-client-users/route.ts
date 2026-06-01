import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { role } = session.user as any;
  if (role !== 'SUPER_ADMIN' && role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const clientUsers = await prisma.clientUser.findMany({
    where: { email1: { not: null } },
  });

  let created = 0;
  let skipped = 0;

  for (const cu of clientUsers) {
    if (!cu.email1) continue;

    const existing = await prisma.user.findUnique({ where: { email: cu.email1 } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.user.create({
      data: {
        name: cu.name,
        email: cu.email1,
        password: null,
        role: 'CLIENT',
        companyId: cu.companyId,
        isActive: true,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped, total: clientUsers.length });
}
