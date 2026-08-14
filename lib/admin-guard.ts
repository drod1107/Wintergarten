import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifySessionCookieValue } from './auth';

export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies();
  return verifySessionCookieValue(store.get(ADMIN_COOKIE_NAME)?.value);
}

export function requireAdminApi(req: NextRequest): NextResponse | null {
  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!verifySessionCookieValue(cookieValue)) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  return null;
}
