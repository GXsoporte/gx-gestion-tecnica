import { Metadata } from 'next';
import { AssetDetailClient } from './asset-detail-client';

export const metadata: Metadata = { title: 'Detalle Activo' };

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  return <AssetDetailClient id={params.id} />;
}
