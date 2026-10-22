import { createHmac, timingSafeEqual } from 'node:crypto';
export const CUSTOMER_COOKIE = 'wolnaa_customer';
export const CHALLENGE_COOKIE = 'wolnaa_customer_challenge';
export const customerCookieOptions = {httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:'strict' as const,path:'/'};
function sign(value:string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Customer access unavailable');
  return createHmac('sha256',secret).update('wolnaa-customer-v1:' + value).digest('hex');
}
export function customerDigest(value:string) { return sign(value); }
export function safeEqual(a:string,b:string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
}
export function createCustomerSession(email:string,now=Date.now()) {
  const payload = Buffer.from(JSON.stringify({email,expires:now+3600000})).toString('base64url');
  return payload + '.' + sign(payload);
}
export function customerSessionEmail(token:string|undefined,now=Date.now()):string|null {
  try {
    if (!token || token.length > 2048) return null;
    const parts = token.split('.');
    if (parts.length !== 2 || !safeEqual(sign(parts[0]),parts[1])) return null;
    const data = JSON.parse(Buffer.from(parts[0],'base64url').toString());
    return typeof data.email === 'string' && Number.isFinite(data.expires) && data.expires > now ? data.email : null;
  } catch { return null; }
}
export function validCustomerEmail(value:unknown):value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function escapeEmailPattern(email:string) { return email.replace(/[\\%_]/g,'\\$&'); }
export function sameOrigin(request:Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}
