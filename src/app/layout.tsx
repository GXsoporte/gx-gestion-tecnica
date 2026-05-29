import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'GX Soporte',
    template: '%s | GX Soporte',
  },
  description: 'Plataforma integral de gestión técnica y soporte tecnológico empresarial',
  keywords: ['soporte técnico', 'gestión tecnológica', 'tickets', 'inventario', 'mantenimiento'],
  authors: [{ name: 'GX Soporte' }],
  creator: 'GX Soporte S.A.S.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
          />
        </Providers>
      </body>
    </html>
  );
}
