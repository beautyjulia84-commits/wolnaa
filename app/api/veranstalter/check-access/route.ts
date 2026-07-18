import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Dieser Anmeldeweg ist nicht mehr verfügbar.' }, { status: 410 });
}
