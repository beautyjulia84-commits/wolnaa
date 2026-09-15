import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const WHEEL_EVENT_ID = 'd3a2c95d-893d-4ee4-8645-b28ec7f61063';
export const WHEEL_COOKIE = 'wolnaa_nuernberg_wheel';
export type WheelReward = { percent: number; expiresAt: number; used: boolean };
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
export function signReward(reward: WheelReward) {
  const payload = Buffer.from(JSON.stringify(reward)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function readReward(req: Request): WheelReward | null {
  try {
    const value = (req.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${WHEEL_COOKIE}=`))?.slice(WHEEL_COOKIE.length + 1);
    if (!value) return null;
    const [payload, signature] = value.split('.');
    const expected = createHmac('sha256', secret()).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const reward = JSON.parse(Buffer.from(payload, 'base64url').toString()) as WheelReward;
    return [5, 10, 15, 20, 25, 50].includes(reward.percent) && Number.isFinite(reward.expiresAt) ? reward : null;
  } catch { return null; }
}
export function drawReward(): WheelReward {
  const roll = randomInt(100);
  const percent = randomInt(300) === 0 ? 50 : roll < 15 ? 5 : roll < 35 ? 10 : roll < 60 ? 15 : roll < 80 ? 20 : 25;
  return { percent, expiresAt: Date.now() + 2 * 60 * 60 * 1000, used: false };
}
export const wheelCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: Math.max(1, Math.ceil((new Date('2026-10-03T00:00:00Z').getTime() - Date.now()) / 1000)) };
