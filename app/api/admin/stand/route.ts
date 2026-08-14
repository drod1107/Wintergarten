import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { setStandStatus } from '@/lib/store';
import type { StandStatus } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = (await req.json()) as Omit<StandStatus, 'updatedAt'>;
  await setStandStatus(body);
  return NextResponse.json({ ok: true });
}
