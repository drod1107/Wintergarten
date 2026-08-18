import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { deleteCareGuide, upsertCareGuide } from '@/lib/store';
import type { CareGuide } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = (await req.json()) as Omit<CareGuide, 'createdAt' | 'updatedAt'>;
  const slug = (body.slug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!slug || !body.title) {
    return NextResponse.json({ error: 'Title and slug are required.' }, { status: 400 });
  }
  await upsertCareGuide({ ...body, slug, sortOrder: Number(body.sortOrder) || 0 });
  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Missing slug.' }, { status: 400 });
  await deleteCareGuide(slug);
  return NextResponse.json({ ok: true });
}
