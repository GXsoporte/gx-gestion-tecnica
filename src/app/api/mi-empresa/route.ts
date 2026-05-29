import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session.user.companyId) {
      return apiError('Sin empresa asignada', 404);
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        id:      true,
        name:    true,
        slug:    true,
        nit:     true,
        logo:    true,
        email:   true,
        phone:   true,
        address: true,
        city:    true,
        country: true,
      },
    });

    if (!company) return apiError('Empresa no encontrada', 404);
    return apiResponse(company);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}
