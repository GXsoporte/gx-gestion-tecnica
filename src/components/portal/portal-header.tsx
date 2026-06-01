'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Monitor, Stethoscope, Wrench, LogOut, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortalHeaderProps {
  userName: string;
}

const NAV_LINKS = [
  { href: '/portal/tickets',      label: 'Tickets',      icon: Ticket       },
  { href: '/portal/inventario',   label: 'Mis equipos',  icon: Monitor      },
  { href: '/portal/diagnosticos', label: 'Diagnósticos', icon: Stethoscope  },
  { href: '/portal/soluciones',   label: 'Soluciones',   icon: Wrench       },
];

export function PortalHeader({ userName }: PortalHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm hidden sm:inline">Portal Cliente</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{userName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
