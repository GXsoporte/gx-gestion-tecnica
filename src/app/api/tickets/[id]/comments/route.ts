import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getCompanyFilter, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';

const commentSchema = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const filter = getCompanyFilter(session);
    const body = await req.json();
    const data = commentSchema.parse(body);

    if (data.isInternal && session.user.role === 'CLIENT') {
      return apiError('Sin permisos para comentarios internos', 403);
    }

    // Verificar que el ticket pertenece a la empresa del usuario
    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, ...filter },
      select: { id: true },
    });
    if (!ticket) return apiError('Ticket no encontrado', 404);

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        isInternal: data.isInternal,
        ticketId: params.id,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
      },
    });

    return apiResponse(comment, 201);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
