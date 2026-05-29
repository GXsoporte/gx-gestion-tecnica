import { Metadata } from 'next';
import { DiagnosticoClient } from './diagnostico-client';

export const metadata: Metadata = { title: 'Diagnóstico IA' };

export default function DiagnosticoPage() {
  return <DiagnosticoClient />;
}
