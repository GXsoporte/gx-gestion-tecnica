import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PortalHeader } from '@/components/portal/portal-header';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/login');
  if ((session.user as any).role !== 'CLIENT') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PortalHeader userName={session.user.name ?? ''} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
