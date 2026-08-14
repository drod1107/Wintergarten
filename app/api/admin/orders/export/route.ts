import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { getOrders, ordersToCsv } from '@/lib/store';

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const orders = await getOrders();
  const csv = ordersToCsv(orders);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wintergarten-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
