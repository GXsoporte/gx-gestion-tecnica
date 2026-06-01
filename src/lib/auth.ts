import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { UserRole } from '@/types/next-auth';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        otp: { label: 'Código OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error('Credenciales requeridas');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        });

        if (!user) throw new Error('Usuario no encontrado');
        if (!user.isActive) throw new Error('Usuario desactivado. Contacte al administrador.');

        // Login por OTP (clientes)
        if (credentials.otp && !credentials.password) {
          if (user.role !== 'CLIENT') {
            throw new Error('El acceso por código solo está disponible para clientes');
          }
          const token = await prisma.verificationToken.findFirst({
            where: {
              identifier: credentials.email,
              token: credentials.otp,
              expires: { gt: new Date() },
            },
          });
          if (!token) throw new Error('Código inválido o expirado');
          // Borrar token usado
          await prisma.verificationToken.deleteMany({ where: { identifier: credentials.email } });

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as UserRole,
            companyId: user.companyId,
            companyName: user.company?.name ?? null,
            companySlug: user.company?.slug ?? null,
          };
        }

        // Login por contraseña (staff)
        if (user.role === 'CLIENT' && !credentials.otp) {
          throw new Error('Los clientes deben usar el acceso por código');
        }

        if (!credentials.password) {
          throw new Error('Credenciales requeridas');
        }

        // Para staff (no CLIENT), password es requerida
        if (user.role !== 'CLIENT' && !user.password) throw new Error('Usuario sin contraseña configurada');

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password!);

        if (!isPasswordValid) {
          throw new Error('Contraseña incorrecta');
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role as UserRole,
          companyId: user.companyId,
          companyName: user.company?.name ?? null,
          companySlug: user.company?.slug ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
        token.companySlug = (user as any).companySlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.companyId = token.companyId as string;
        session.user.companyName = token.companyName as string;
        session.user.companySlug = token.companySlug as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
