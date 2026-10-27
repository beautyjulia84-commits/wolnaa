"use client";
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

type Pixel = ((...args: unknown[]) => void) & {queue: unknown[][]; callMethod?: (...args:unknown[])=>void; push?: Pixel; loaded?:boolean; version?:string};
declare global {interface Window {fbq?: Pixel; _fbq?:Pixel;}}
const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
  const pathname = usePathname();
  useEffect(()=>{
    // Only public shop pages: never send account, signature, admin or checkout URLs.
    const publicPage = pathname === '/' || /^\/event\/[^/]+$/.test(pathname || '') || pathname === '/events';
    let sent = false;
    const sync = () => {
      const allowed = localStorage.getItem('wolnaa-cookie-consent') === 'all' && localStorage.getItem('wolnaa-meta-consent-version') === '2';
      document.cookie = `wolnaa-meta-consent=${allowed?'2':''}; Path=/; SameSite=Lax; Secure; Max-Age=${allowed?15552000:0}`;
      if (!allowed) {
        window.fbq?.('consent','revoke');
        for (const name of ['_fbp','_fbc']) for (const domain of ['', '; Domain=.wolnaa.de', '; Domain=www.wolnaa.de']) document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
        return;
      }
      if (!pixelId || !publicPage) return;
      const query = new URLSearchParams(window.location.search);
      if ([...query.keys()].some(key=>!['fbclid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','lang','cookies'].includes(key))) return;
      if (!window.fbq) {
        const fbq: Pixel = Object.assign((...args:unknown[])=>{if(fbq.callMethod)fbq.callMethod(...args);else fbq.queue.push(args);},{queue:[] as unknown[][]});
        window.fbq=fbq; window._fbq=fbq; fbq.push=fbq; fbq.loaded=true; fbq.version='2.0';
        fbq('set','autoConfig',false,pixelId);
        fbq('consent','grant');
        fbq('init',pixelId);
        const script=document.createElement('script'); script.async=true; script.src='https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
      } else window.fbq('consent','grant');
      if (!sent) {window.fbq('trackSingle',pixelId,'PageView'); sent=true;}
    };
    sync(); window.addEventListener('wolnaa-consent-change',sync);
    return ()=>window.removeEventListener('wolnaa-consent-change',sync);
  },[pathname]);
  return null;
}
