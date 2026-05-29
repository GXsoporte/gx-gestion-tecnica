import { Metadata } from 'next';
import { SeguridadClient } from './seguridad-client';

export const metadata: Metadata = { title: 'Seguridad' };

export default function SeguridadPage() {
  return <SeguridadClient />;
}
