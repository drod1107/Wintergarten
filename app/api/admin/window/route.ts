import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { setOrderWindow } from '@/lib/store';
import type { OrderWindow } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = (await req.json()) as OrderWindow;
  await setOrderWindow({
    status: body.status,
    opensAt: body.opensAt || null,
    closesAt: body.closesAt || null,
    pickupDays: body.pickupDays || '',
    notes: body.notes || '',
  });
  return NextResponse.json({ ok: true });
}
