import { NextResponse } from 'next/server';
import { VERANSTALTER_AUTH_COOKIE } from '@/lib/veranstalter-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('veranstalter_id', '', { path: '/', maxAge: 0 });
  response.cookies.set(VERANSTALTER_AUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
