import { NextRequest,NextResponse } from 'next/server';
import { randomInt,randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';
import { CUSTOMER_COOKIE,CHALLENGE_COOKIE,customerCookieOptions,customerDigest,createCustomerSession,safeEqual,sameOrigin,validCustomerEmail } from '@/lib/customer-access';
export const runtime='nodejs';
function reply(body:object,status=200) {return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
export async function POST(req:NextRequest) {
  if (!sameOrigin(req)) return reply({error:'Anfrage nicht erlaubt.'},403);
  try {
    const input = await req.json();
    const now = Date.now();
    if (input.action === 'send') {
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      if (!validCustomerEmail(email)) return reply({error:'Bitte eine gültige E-Mail-Adresse angeben.'},400);
      // Unique inserts provide atomic rate limits across server instances. No ticket lookup
      // here: the response never discloses whether this address has purchased tickets.
      const ip = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      for (const [identity,period] of [[email,300000],[ip,60000]] as const) {
        const expires = (Math.floor(now/period)+1)*period;
        const key = `customer-access:${expires}:rate:${customerDigest(identity)}`;
        const {error} = await supabase.from('settings').insert({key,value:'rate'});
        if (error?.code === '23505') return reply({error:'Bitte warte einige Minuten, bevor du einen neuen Code anforderst.'},429);
        if (error) throw error;
      }
      const expires=now+600000;
      const key=`customer-access:${expires}:code:${randomUUID()}`;
      const code=String(randomInt(100000,1000000));
      const value=JSON.stringify({email,expires,attempts:0,digest:customerDigest(key+':'+code)});
      const {error}=await supabase.from('settings').insert({key,value});
      if (error) throw error;
      const {error:mailError}=await new Resend(process.env.RESEND_API_KEY!).emails.send({
        from:process.env.RESEND_FROM_EMAIL || 'WOLNAA Tickets <kontakt@wolnaa.de>',to:email,
        subject:'Dein WOLNAA-Anmeldecode',
        text:`Dein Code für Mein Bereich: ${code}\n\nDer Code ist 10 Minuten gültig. Gib ihn nur auf wolnaa.de ein und teile ihn nicht mit anderen.\nFalls du keine Anmeldung angefordert hast, ignoriere diese Nachricht.`,
      });
      if (mailError) {await supabase.from('settings').delete().eq('key',key); throw mailError;}
      // Remove expired challenges and rate records, including their email addresses.
      await supabase.from('settings').delete().gte('key','customer-access:').lt('key',`customer-access:${now}:`);
      const response=reply({sent:true});
      response.cookies.set(CHALLENGE_COOKIE,key,{...customerCookieOptions,maxAge:600});
      return response;
    }
    if (input.action === 'verify') {
      const key=req.cookies.get(CHALLENGE_COOKIE)?.value;
      if (!key || !/^customer-access:\d{13}:code:[a-f0-9-]{36}$/.test(key) || typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) return reply({error:'Bitte den sechsstelligen Code eingeben oder einen neuen anfordern.'},400);
      const {data,error}=await supabase.from('settings').select('value').eq('key',key).maybeSingle();
      if (error) throw error;
      if (!data) return reply({error:'Code abgelaufen. Bitte neu anfordern.'},401);
      const challenge=JSON.parse(data.value);
      if (challenge.expires<=now || challenge.attempts>=5 || challenge.used) return reply({error:'Code abgelaufen oder zu oft versucht. Bitte neu anfordern.'},401);
      const valid=safeEqual(challenge.digest,customerDigest(key+':'+input.code));
      // Compare-and-swap consumes exactly one attempt/code even under parallel requests.
      const {data:updated,error:updateError}=await supabase.from('settings').update({value:JSON.stringify({...challenge,attempts:challenge.attempts+1,used:valid})}).eq('key',key).eq('value',data.value).select('key');
      if (updateError) throw updateError;
      if (!updated?.length || !valid) return reply({error:'Code nicht gültig. Bitte prüfen.'},401);
      const response=reply({success:true});
      response.cookies.set(CUSTOMER_COOKIE,createCustomerSession(challenge.email),{...customerCookieOptions,maxAge:3600});
      response.cookies.set(CHALLENGE_COOKIE,'',{...customerCookieOptions,maxAge:0});
      await supabase.from('settings').delete().eq('key',key);
      return response;
    }
    return reply({error:'Ungültige Anfrage.'},400);
  } catch { return reply({error:'Anmeldung gerade nicht möglich. Bitte später erneut versuchen.'},503); }
}
export async function DELETE(req:NextRequest) {
  if (!sameOrigin(req)) return reply({error:'Anfrage nicht erlaubt.'},403);
  const response=reply({success:true});
  response.cookies.set(CUSTOMER_COOKIE,'',{...customerCookieOptions,maxAge:0});
  response.cookies.set(CHALLENGE_COOKIE,'',{...customerCookieOptions,maxAge:0});
  return response;
}
