import { NextResponse } from 'next/server';

// Temporary diagnostic endpoint — remove after email is confirmed working.
export async function GET() {
  return NextResponse.json({
    hasResendKey: Boolean((process.env.RESEND_API_KEY || '').trim()),
    hasNotifyEmail: Boolean((process.env.ORDER_NOTIFY_EMAIL || '').trim()),
    hasNotifyFrom: Boolean((process.env.ORDER_NOTIFY_FROM || '').trim()),
    notifyEmail: (process.env.ORDER_NOTIFY_EMAIL || '').trim() || null,
    notifyFrom: (process.env.ORDER_NOTIFY_FROM || '').trim() || null,
  });
}
