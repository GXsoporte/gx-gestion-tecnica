import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';
import OpenAI from 'openai';

const diagnosisSchema = z.object({
  input: z.string().min(10, 'Describe al menos 10 caracteres'),
  activityId: z.string().optional(),
  assetId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = diagnosisSchema.parse(body);

    // Verificar que la actividad/activo referenciado pertenece a la empresa del usuario
    if (data.activityId && session.user.role !== 'SUPER_ADMIN') {
      const activity = await prisma.activity.findFirst({
        where: { id: data.activityId, companyId: session.user.companyId || undefined },
        select: { id: true },
      });
      if (!activity) return apiError('Actividad no encontrada', 404);
    }
    if (data.assetId && session.user.role !== 'SUPER_ADMIN') {
      const asset = await prisma.asset.findFirst({
        where: { id: data.assetId, companyId: session.user.companyId || undefined },
        select: { id: true },
      });
      if (!asset) return apiError('Activo no encontrado', 404);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Eres un técnico experto en soporte informático y redes. Analiza los siguientes síntomas de un equipo o sistema y proporciona un diagnóstico técnico profesional.

SÍNTOMAS REPORTADOS:
${data.input}

Responde en formato JSON con la siguiente estructura exacta:
{
  "diagnosis": "Diagnóstico técnico principal (2-3 oraciones)",
  "causes": ["Causa 1", "Causa 2", "Causa 3"],
  "recommendations": ["Recomendación 1", "Recomendación 2", "Recomendación 3"],
  "suggestedSolution": "Solución técnica detallada paso a paso",
  "criticality": "BAJA|MEDIA|ALTA|CRITICA",
  "estimatedTime": "Tiempo estimado de resolución"
}

Sé específico, técnico y profesional. Usa terminología técnica apropiada.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    const tokens = completion.usage?.total_tokens;

    const diagnosis = await prisma.aIDiagnosis.create({
      data: {
        input: data.input,
        diagnosis: result.diagnosis || '',
        causes: Array.isArray(result.causes) ? result.causes.join('\n') : result.causes || '',
        recommendations: Array.isArray(result.recommendations)
          ? result.recommendations.join('\n')
          : result.recommendations || '',
        suggestedSolution: result.suggestedSolution || '',
        criticality: result.criticality || 'MEDIA',
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        tokens,
        activityId: data.activityId,
        assetId: data.assetId,
        userId: session.user.id,
      },
    });

    return apiResponse({ ...result, id: diagnosis.id, tokens }, 201);
  } catch (e: any) {
    if (e.name === 'ZodError') return apiError('Datos inválidos: ' + e.errors[0]?.message, 400);
    if (e.code === 'invalid_api_key' || e.status === 401) {
      return apiError('API key de OpenAI no configurada o inválida. Configure OPENAI_API_KEY en .env', 503);
    }
    return apiError(e.message || 'Error al generar diagnóstico', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    let where: any = {};
    if (session.user.role === 'SUPER_ADMIN') {
      // Ve todo
      where = {};
    } else if (['COMPANY_ADMIN'].includes(session.user.role)) {
      // Ve todos los diagnósticos cuya actividad o activo pertenecen a su empresa
      where = {
        OR: [
          { activity: { companyId: session.user.companyId } },
          { asset:    { companyId: session.user.companyId } },
          { userId: session.user.id }, // incluye los suyos sin actividad/activo
        ],
      };
    } else {
      // TECHNICIAN / CLIENT: solo los propios
      where = { userId: session.user.id };
    }

    const diagnoses = await prisma.aIDiagnosis.findMany({
      where,
      include: {
        user:  { select: { name: true } },
        asset: { select: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return apiResponse(diagnoses);
  } catch (e: any) {
    return apiError(e.message, 500);
  }
}
