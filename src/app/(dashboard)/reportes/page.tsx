import { Metadata } from 'next';
import { ReportesClient } from './reportes-client';

export const metadata: Metadata = { title: 'Reportes' };

export default function ReportesPage() {
  return <ReportesClient />;
}
