import { NextRequest, NextResponse } from 'next/server';
import { recordAnalytics } from '@/lib/analytics';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const path = typeof body.path === 'string' ? body.path.slice(0,160) : '/';
    if (['/admin','/veranstalter','/wolnaa-admin','/api'].some(prefix => path.startsWith(prefix))) return new NextResponse(null,{status:204});
    const source = typeof body.referrer === 'string' ? body.referrer.slice(0,100) : 'Direkt / unbekannt';
    if (body.attributionOnly !== true) await recordAnalytics({kind:'view',path,source,device:body.device === 'Mobil' ? 'Mobil' : 'Desktop',newVisit:body.newVisit === true});
    const response = new NextResponse(null,{status:204});
    if (body.attributionConsent === true && !req.cookies.has('wolnaa-source')) response.cookies.set('wolnaa-source',source,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'});
    if (body.attributionConsent === false) response.cookies.set('wolnaa-source','',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});
    return response;
  } catch (error) {
    console.error('Analytics storage failed',error);
    return NextResponse.json({error:'Aufruf konnte nicht gespeichert werden.'},{status:500});
  }
}
