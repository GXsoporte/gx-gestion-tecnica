import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateSchema = z.object({
  name:            z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  phone:           z.string().optional(),
  position:        z.string().optional(),
  department:      z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres').optional(),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id:         true,
        name:       true,
        email:      true,
        phone:      true,
        position:   true,
        department: true,
        role:       true,
        isActive:   true,
        image:      true,
        lastLogin:  true,
        createdAt:  true,
        companyId:  true,
        company: {
          select: { id: true, name: true, slug: true, logo: true, plan: true },
        },
        _count: {
          select: {
            assignedTickets:    true,
            createdTickets:     true,
            activities:         true,
            createdActivities:  true,
            maintenances:       true,
          },
        },
        timeEntries: {
          select: { minutes: true },
        },
      },
    });

    if (!user) return apiError('Usuario no encontrado', 404);

    const totalMinutes = user.timeEntries.reduce((acc, e) => acc + e.minutes, 0);

    return apiResponse({
      id:              user.id,
      name:            user.name,
      email:           user.email,
      phone:           user.phone,
      position:        user.position,
      department:      user.department,
      role:            user.role,
      isActive:        user.isActive,
      image:           user.image,
      lastLogin:       user.lastLogin,
      createdAt:       user.createdAt,
      company:         user.company,
      stats: {
        assignedTickets:   user._count.assignedTickets,
        createdTickets:    user._count.createdTickets,
        activities:        user._count.activities,
        createdActivities: user._count.createdActivities,
        maintenances:      user._count.maintenances,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      },
    });
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Si quiere cambiar contraseña, verificar la actual
    let hashedNewPassword: string | undefined;
    if (data.newPassword) {
      if (!data.currentPassword) {
        return apiError('Debes ingresar tu contraseña actual', 400);
      }
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      });
      if (!user?.password) return apiError('Usuario sin contraseña configurada', 400);

      const valid = await bcrypt.compare(data.currentPassword, user.password);
      if (!valid) return apiError('La contraseña actual es incorrecta', 400);

      hashedNewPassword = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name       !== undefined && { name:       data.name       }),
        ...(data.phone      !== undefined && { phone:      data.phone      }),
        ...(data.position   !== undefined && { position:   data.position   }),
        ...(data.department !== undefined && { department: data.department }),
        ...(hashedNewPassword              && { password:   hashedNewPassword }),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        position: true, department: true, role: true,
      },
    });

    return apiResponse(updated);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, e.statusCode || 500);
  }
}
