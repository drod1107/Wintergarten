import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, branchForPoint } from '@/lib/geo';

export async function POST(req: NextRequest) {
  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const address = (body.address || '').trim();
  if (address.length < 5) {
    return NextResponse.json({ branch: { branch: 'unresolved' } });
  }

  const result = await geocodeAddress(address);
  if (!result) {
    return NextResponse.json({ branch: { branch: 'unresolved' } });
  }

  const branch = branchForPoint({ lat: result.lat, lng: result.lng });
  return NextResponse.json({ branch, matchedAddress: result.matchedAddress });
}
