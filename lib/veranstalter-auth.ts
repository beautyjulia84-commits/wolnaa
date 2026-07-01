import { createHmac, timingSafeEqual } from 'crypto';

export const VERANSTALTER_AUTH_COOKIE = 'veranstalter_auth';

function getSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_PASSWORD || 'wolnaa-dev-secret';
}

function signatureFor(id: string) {
  return createHmac('sha256', getSecret()).update(id).digest('hex');
}

export function createVeranstalterAuthToken(id: string) {
  return `${id}.${signatureFor(id)}`;
}

export function verifyVeranstalterAuthToken(token?: string | null) {
  if (!token) return null;

  const [id, signature] = token.split('.');
  if (!id || !signature) return null;

  const expected = signatureFor(id);
  const receivedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

  return id;
}

export function getCookieValue(req: Request, name: string) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function getAuthedVeranstalterId(req: Request) {
  return verifyVeranstalterAuthToken(getCookieValue(req, VERANSTALTER_AUTH_COOKIE));
}

export function veranstalterAuthCookieOptions() {
  return {
    path: '/',
    maxAge: 86400,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}
