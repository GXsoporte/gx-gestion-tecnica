'use client';

import { signOut } from 'next-auth/react';
import { Stethoscope, LogOut, UserCircle } from 'lucide-react';

interface PortalHeaderProps {
  userName: string;
}

export function PortalHeader({ userName }: PortalHeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm">Portal Cliente</span>
        </div>
        <div className="flex items-center gap-3">
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
