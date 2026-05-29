'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { GlobalSearch } from '@/components/ui/global-search';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function Header({ onMobileMenuToggle, mobileMenuOpen }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const initials = session?.user?.name ? getInitials(session.user.name) : 'U';

  // ── ⌘K / Ctrl+K global shortcut ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-border flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        onClick={onMobileMenuToggle}
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Menu className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div
          className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground hidden sm:block">
            Buscar tickets, activos, clientes...
          </span>
          <span className="ml-auto hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="bg-white dark:bg-slate-800 border border-border rounded px-1.5 py-0.5 font-mono">⌘</kbd>
            <kbd className="bg-white dark:bg-slate-800 border border-border rounded px-1.5 py-0.5 font-mono">K</kbd>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Cambiar tema"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || ''}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-semibold">{initials}</span>
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground leading-tight">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {session?.user?.role?.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-border shadow-premium z-50 py-1">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{session?.user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/configuracion/perfil"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    Mi perfil
                  </Link>
                  <Link
                    href="/configuracion"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Configuración
                  </Link>
                </div>
                <div className="border-t border-border py-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
