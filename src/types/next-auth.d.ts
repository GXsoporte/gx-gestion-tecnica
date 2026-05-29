import { UserRole } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
    companyId: string | null;
    companyName: string | null;
    companySlug: string | null;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: UserRole;
      companyId: string | null;
      companyName: string | null;
      companySlug: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    companyId: string | null;
    companyName: string | null;
    companySlug: string | null;
  }
}
