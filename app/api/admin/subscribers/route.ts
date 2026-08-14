import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { importSubscribers, exportSubscribersCsv } from '@/lib/store';

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = (await req.json()) as { emails?: string };
  const emails = (body.emails || '')
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const result = await importSubscribers(emails);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const csv = await exportSubscribersCsv();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wintergarten-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
