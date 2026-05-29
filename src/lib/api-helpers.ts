import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new ApiError('No autorizado', 401);
  }
  return session;
}

export function getCompanyFilter(session: any) {
  if (session.user.role === 'SUPER_ADMIN') return {};
  // Prisma silently ignores `undefined` values in where clauses, which would
  // cause all records to leak across companies. Use an impossible value instead.
  const companyId = session.user.companyId ?? '__NO_COMPANY__';
  return { companyId };
}

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function logAudit(
  action: string,
  entity: string,
  entityId: string,
  companyId: string,
  userId?: string,
  oldValues?: any,
  newValues?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        oldValues: oldValues != null ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : null,
        newValues: newValues != null ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : null,
        userId,
        companyId,
      },
    });
  } catch (e) {
    console.error('Error al registrar auditoría:', e);
  }
}

export function generateNumber(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

/**
 * Returns the next available sequential number for a given prefix by querying
 * the actual maximum existing value — safe even when records have been deleted.
 * Using count() instead would produce duplicates if any record was previously removed.
 */
export async function nextNumber(
  prefix: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: { findFirst: (args: any) => Promise<Record<string, any> | null> },
  numberField: string,
  companyFilter?: Record<string, string>
): Promise<string> {
  const last = await model.findFirst({
    where: { ...(companyFilter ?? {}), [numberField]: { startsWith: `${prefix}-` } },
    orderBy: { [numberField]: 'desc' },
    select: { [numberField]: true },
  });
  const lastNum = last?.[numberField]
    ? parseInt((last[numberField] as string).replace(`${prefix}-`, ''), 10)
    : 0;
  return `${prefix}-${String(lastNum + 1).padStart(6, '0')}`;
}
