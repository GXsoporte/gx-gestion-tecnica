import { Metadata } from 'next';
import { ClientesClient } from './clientes-client';

export const metadata: Metadata = { title: 'Clientes' };

export default function ClientesPage() {
  return <ClientesClient />;
}
