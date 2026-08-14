import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { upsertProduct } from '@/lib/store';
import type { Product } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = (await req.json()) as Product;
  if (!body.id || !body.name) {
    return NextResponse.json({ error: 'Product id and name are required.' }, { status: 400 });
  }
  await upsertProduct(body);
  return NextResponse.json({ ok: true });
}
