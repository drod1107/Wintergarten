import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { setKitchenRecord, setStory } from '@/lib/store';
import type { KitchenRecordContent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = (await req.json()) as { record: KitchenRecordContent; story?: string };
  await setKitchenRecord(body.record);
  if (typeof body.story === 'string') await setStory(body.story);
  return NextResponse.json({ ok: true });
}
