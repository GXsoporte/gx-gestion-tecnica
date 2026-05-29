import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';

const db = prisma as any;

const planSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0).default(0),
  currency: z.string().default('COP'),
  maxUsers: z.number().int().min(1).default(3),
  maxClients: z.number().int().min(1).default(10),
  maxTickets: z.number().int().nullable().default(null),
  maxStorageGb: z.number().int().min(1).default(1),
  durationDays: z.number().int().nullable().default(null),
  // Feature flags
  hasInventory: z.boolean().default(true),
  hasTickets: z.boolean().default(true),
  hasActivities: z.boolean().default(true),
  hasManualDiagnosis: z.boolean().default(true),
  hasAIDiagnosis: z.boolean().default(false),
  hasInvoicing: z.boolean().default(false),
  hasServices: z.boolean().default(false),
  hasDocuments: z.boolean().default(false),
  hasAdvancedKPIs: z.boolean().default(false),
  hasPDFExport: z.boolean().default(true),
  hasAutoEmails: z.boolean().default(false),
  hasBrandCustom: z.boolean().default(false),
  hasAuditLog: z.boolean().default(false),
  hasMaintenances: z.boolean().default(false),
  hasCoordinator: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const plans = await db.plan.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { price: 'asc' },
    });
    return apiResponse(plans);
  } catch (e: any) {
    return apiError(e.message, e.statusCode || 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'SUPER_ADMIN') return apiError('Sin permisos', 403);

    const body = await req.json();
    const data = planSchema.parse(body);

    const existing = await db.plan.findUnique({ where: { code: data.code } });
    if (existing) return apiError('Ya existe un plan con ese código', 400);

    const plan = await db.plan.create({ data });
    return apiResponse(plan, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    return apiError(e.message, 500);
  }
}
