import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) return apiError('No se recibió ningún archivo', 400);
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('Tipo de archivo no permitido. Solo imágenes y PDF.', 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError('El archivo supera el límite de 10 MB', 400);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, uniqueName), buffer);

    return apiResponse({
      url: `/uploads/${folder}/${uniqueName}`,
      name: uniqueName,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (e: any) {
    return apiError(e.message || 'Error al subir archivo', e.statusCode || 500);
  }
}
