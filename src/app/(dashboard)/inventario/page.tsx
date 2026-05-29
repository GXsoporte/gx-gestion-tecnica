import { Metadata } from 'next';
import { InventarioClient } from './inventario-client';

export const metadata: Metadata = { title: 'Inventario de Activos' };

export default function InventarioPage() {
  return <InventarioClient />;
}
