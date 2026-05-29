import { Metadata } from 'next';
import { MantenimientoDetailClient } from './mantenimiento-detail-client';

export const metadata: Metadata = { title: 'Detalle de Mantenimiento' };

export default function MantenimientoDetailPage({ params }: { params: { id: string } }) {
  return <MantenimientoDetailClient id={params.id} />;
}
