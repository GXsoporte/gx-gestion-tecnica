import { Metadata } from 'next';
import { ActividadesClient } from './actividades-client';

export const metadata: Metadata = { title: 'Actividades' };

export default function ActividadesPage() {
  return <ActividadesClient />;
}
