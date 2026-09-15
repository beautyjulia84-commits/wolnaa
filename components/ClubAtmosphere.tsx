'use client';
import { useEffect, useRef } from 'react';
export default function ClubAtmosphere({lang}:{lang:'de'|'ru'}) {
  const section=useRef<HTMLElement>(null);
  const background=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame=0;
    const update=()=>{
      frame=0;
      if(!section.current || !background.current) return;
      const rect=section.current.getBoundingClientRect();
      if(rect.bottom>0 && rect.top<window.innerHeight) background.current.style.transform=`translate3d(0,${-rect.top}px,0)`;
    };
    const schedule=()=>{if(!frame) frame=requestAnimationFrame(update);};
    update(); window.addEventListener('scroll',schedule,{passive:true}); window.addEventListener('resize',schedule);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[]);
  return <section ref={section} className="relative isolate min-h-[540px] overflow-hidden border-y border-[#d6b36a]/20 bg-zinc-950 md:min-h-[620px]">
    <div ref={background} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[100lvh] min-h-[620px] bg-cover bg-[position:55%_45%] md:bg-[position:center_35%] will-change-transform" style={{backgroundImage:'url(/club-atmosphere-wolnaa.jpg)'}} />
    <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/40 to-black/90" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#d6b36a25,transparent_65%)]" />
    <div className="reveal-section relative mx-auto flex min-h-[540px] max-w-7xl flex-col justify-end px-6 py-16 md:min-h-[620px] md:py-24">
      <p className="mb-5 text-xs font-bold tracking-[.3em] text-[#ead08d]">WOLNAA</p>
      <h2 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">{lang==='de' ? 'Mehr als eine Nacht.' : 'Больше, чем просто ночь.'}</h2>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">{lang==='de' ? 'Russische Vibes. Echte Energie. Unvergessliche Momente.' : 'Русская атмосфера. Настоящая энергия. Незабываемые моменты.'}</p>
      <p className="mt-4 max-w-lg text-base leading-7 text-white/75">{lang==='de' ? 'Musik, die dich mitnimmt. Menschen, die deine Stimmung teilen. Bei WOLNAA wird aus einem Abend eine Nacht, die bleibt – mit besonderen Locations und Momenten, die uns verbinden.' : 'Музыка, которая увлекает. Люди, которые разделяют твоё настроение. С WOLNAA обычный вечер превращается в ночь, которую хочется помнить — в особенных местах, с моментами, которые нас объединяют.'}</p>
      <span className="mt-8 h-px w-20 bg-[#d6b36a]" />
    </div>
  </section>;
}
