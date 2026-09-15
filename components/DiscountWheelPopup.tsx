'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DiscountWheel from './DiscountWheel';
const ignoreReward = () => {};
export default function DiscountWheelPopup() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Date.now() >= new Date('2026-10-02T23:59:00+02:00').getTime()) return;
    const timer = window.setTimeout(() => {
      try {
        if (localStorage.getItem('wolnaa-wheel-popup-nuernberg-2026')) return;
        localStorage.setItem('wolnaa-wheel-popup-nuernberg-2026', 'shown');
        if (sessionStorage.getItem('wolnaa-wheel-popup')) return;
      } catch {
        // If storage is unavailable, avoid repeatedly interrupting visitors.
        return;
      }
      setOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [open]);
  return <>
    {open && <div role="dialog" aria-modal="true" aria-label="Rabatt-Glücksrad Nürnberg" className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md" onClick={() => setOpen(false)}>
      <div className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#d6b36a]/40 bg-[#0c0c0c] shadow-[0_0_100px_#d6b36a20]" onClick={e => e.stopPropagation()}>
        <button autoFocus aria-label="Schließen" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black text-xl text-white">×</button>
        <DiscountWheel eventId="d3a2c95d-893d-4ee4-8645-b28ec7f61063" onReward={ignoreReward} onSpinComplete={() => router.push('/event/wolnaa--indoor-festival')} />
        <Link href="/event/wolnaa--indoor-festival" className="mx-6 mb-6 block rounded-lg border border-[#d6b36a]/40 py-3 text-center text-sm font-semibold text-[#d6b36a]">Zum Nürnberger Indoor Festival →</Link>
      </div>
    </div>}
  </>;
}
