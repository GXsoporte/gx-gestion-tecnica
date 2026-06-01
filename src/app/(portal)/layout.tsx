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
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
