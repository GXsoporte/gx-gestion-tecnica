import { Metadata } from 'next';
import { MantenimientosClient } from './mantenimientos-client';

export const metadata: Metadata = { title: 'Mantenimientos' };

export default function MantenimientosPage() {
  return <MantenimientosClient />;
}
