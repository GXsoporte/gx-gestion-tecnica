import { Metadata } from 'next';
import { TicketsClient } from './tickets-client';

export const metadata: Metadata = { title: 'Tickets' };

export default function TicketsPage() {
  return <TicketsClient />;
}
