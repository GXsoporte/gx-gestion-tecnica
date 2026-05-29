import { Metadata } from 'next';
import { TicketDetailClient } from './ticket-detail-client';

export const metadata: Metadata = { title: 'Detalle Ticket' };

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return <TicketDetailClient id={params.id} />;
}
