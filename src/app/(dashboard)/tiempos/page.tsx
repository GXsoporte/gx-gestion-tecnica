import { Metadata } from 'next';
import { TiemposClient } from './tiempos-client';

export const metadata: Metadata = { title: 'Control de Tiempos' };

export default function TiemposPage() {
  return <TiemposClient />;
}
