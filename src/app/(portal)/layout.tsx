import { redirect } from 'next/navigation';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  redirect('/dashboard');
}
