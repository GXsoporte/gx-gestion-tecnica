import { Metadata } from 'next';
import { ActividadDetailClient } from './actividad-detail-client';

export const metadata: Metadata = { title: 'Detalle Actividad' };

export default function ActividadDetailPage({ params }: { params: { id: string } }) {
  return <ActividadDetailClient id={params.id} />;
}
