'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Ticket,
  Monitor,
  Wrench,
  BrainCircuit,
  FileBarChart2,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Zap,
  Clock,
  Bell,
  Shield,
  UserCircle,
  Receipt,
  Stethoscope,
  Briefcase,
  CreditCard,
  Hammer,
  UserCheck,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: number;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Tickets',
    href: '/tickets',
    icon: Ticket,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'CLIENT'],
  },
  {
    label: 'Actividades',
    href: '/actividades',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN'],
  },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: Users,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN'],
  },
  {
    label: 'Inventario',
    href: '/inventario',
    icon: Monitor,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'CLIENT'],
  },
  {
    label: 'Mantenimientos',
    href: '/mantenimientos',
    icon: Wrench,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN'],
  },
  {
    label: 'Diagnóstico IA',
    href: '/diagnostico',
    icon: BrainCircuit,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'],
  },
  {
    label: 'Diagnósticos',
    href: '/diagnosticos',
    icon: Stethoscope,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR', 'CLIENT'],
  },
  {
    label: 'Soluciones',
    href: '/soluciones',
    icon: Hammer,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR', 'CLIENT'],
  },
  {
    label: 'Servicios',
    href: '/servicios',
    icon: Briefcase,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'],
  },
  {
    label: 'Tiempos',
    href: '/tiempos',
    icon: Clock,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'COORDINATOR'],
  },
  {
    label: 'Facturación',
    href: '/facturacion',
    icon: Receipt,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'CLIENT'],
  },
  {
    label: 'Reportes',
    href: '/reportes',
    icon: FileBarChart2,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'CLIENT'],
  },
  {
    label: 'Documentos',
    href: '/documentos',
    icon: FolderOpen,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'CLIENT'],
  },
  {
    label: 'Mi Perfil',
    href: '/configuracion/perfil',
    icon: UserCircle,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TECHNICIAN', 'CLIENT'],
  },
];

const adminItems: NavItem[] = [
  {
    label: 'Empresas',
    href: '/super-admin/empresas',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Planes SaaS',
    href: '/planes',
    icon: CreditCard,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Vendedores',
    href: '/vendedores',
    icon: UserCheck,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Seguridad',
    href: '/configuracion/seguridad',
    icon: Shield,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const userRole = session?.user?.role || 'CLIENT';

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );
  const filteredAdmin = adminItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-sidebar-border',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-tight">GX Soporte</p>
            <p className="text-sidebar-foreground/50 text-xs">Gestión Técnica</p>
          </div>
        )}
      </div>

      {/* Empresa */}
      {!collapsed && session?.user?.companyName && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="w-3 h-3 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-xs font-medium truncate">
                {session.user.companyName}
              </p>
              <p className="text-sidebar-foreground/40 text-xs capitalize">
                {userRole.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navegación principal */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <div className="mb-4">
          {!collapsed && (
            <p className="text-sidebar-foreground/30 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
              Principal
            </p>
          )}
          {filteredNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'sidebar-nav-item',
                collapsed ? 'justify-center px-2' : '',
                isActive(item.href)
                  ? 'sidebar-nav-item-active'
                  : 'sidebar-nav-item-inactive'
              )}
            >
              <item.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {filteredAdmin.length > 0 && (
          <div>
            {!collapsed && (
              <p className="text-sidebar-foreground/30 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4">
                Administración
              </p>
            )}
            {collapsed && <div className="border-t border-sidebar-border my-2" />}
            {filteredAdmin.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'sidebar-nav-item',
                  collapsed ? 'justify-center px-2' : '',
                  isActive(item.href)
                    ? 'sidebar-nav-item-active'
                    : 'sidebar-nav-item-inactive'
                )}
              >
                <item.icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Toggle collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-sidebar-border rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors group z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-sidebar-foreground group-hover:text-white" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-sidebar-foreground group-hover:text-white" />
        )}
      </button>
    </aside>
  );
}
