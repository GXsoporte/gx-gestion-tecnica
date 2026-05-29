import { Metadata } from 'next';
import { ClientDetailClient } from './client-detail-client';

export const metadata: Metadata = { title: 'Detalle Cliente' };

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  return <ClientDetailClient id={params.id} />;
}
