'use client';
import {useMemo} from 'react';
import {eventTiming, type TimedEvent} from '@/lib/event-timing';
import {useEventClock} from '@/lib/use-event-clock';

export default function EventCountdown({event, compact=false, overlay=false, lang='de'}: {event:TimedEvent & {description?:string}; compact?:boolean; overlay?:boolean; lang?:'de'|'ru'}) {
  const now = useEventClock();
  const timing = useMemo(() => eventTiming(event,0), [event.date,event.time,event.event_ends_at,event.online_sale_ends_at]);
  if (/^\s*ABGESAGT\b/i.test(event.description || '') || !Number.isFinite(timing.starts)) return null;
  const remaining = now ? Math.max(0,Math.ceil((timing.starts-now)/1000)) : null;
  if (now && now >= timing.starts) return <p className="mt-4 text-sm text-[#d6b36a]">{now >= timing.ends ? (lang==='de'?'Event beendet':'Событие завершено') : (lang==='de'?'Event läuft':'Событие началось')}</p>;
  const values = remaining===null ? [null,null,null,null] : [Math.floor(remaining/86400),Math.floor(remaining%86400/3600),Math.floor(remaining%3600/60),remaining%60];
  const labels = lang==='de' ? ['Tage','Stunden','Minuten','Sekunden'] : ['Дни','Часы','Минуты','Секунды'];
  return <div className={overlay?'py-5':compact?'mt-5 border-t border-white/10 pt-4':'my-6 border-y border-white/10 py-6'} aria-label={lang==='de'?'Countdown bis zum Eventbeginn':'До начала события'}>
    <p className={`mb-3 text-sm ${overlay?'text-white':'text-zinc-400'}`}>{lang==='de'?'Bis zum Eventbeginn':'До начала события'}</p>
    <div className="grid grid-cols-4 gap-2 text-center">
      {values.map((value,i)=><div key={labels[i]} className="relative">{i===1 && <span aria-hidden="true" className={`pointer-events-none absolute -right-1 top-0 translate-x-1/2 font-semibold text-[#d6b36a] ${compact?'text-2xl':'text-4xl sm:text-5xl'}`}>:</span>}<span className={`block font-semibold tabular-nums text-[#d6b36a] ${compact?'text-2xl':'text-4xl sm:text-5xl'}`}>{value===null?'–':String(value).padStart(2,'0')}</span><span className={`mt-2 block text-[11px] sm:text-xs ${overlay?'text-zinc-200':'text-zinc-400'}`}>{labels[i]}</span></div>)}
    </div>
  </div>;
}
