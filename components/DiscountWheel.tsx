'use client';
import { useEffect, useState } from 'react';

type Reward = { percent: number; expiresAt: number; used: boolean };
export default function DiscountWheel({ eventId, onReward }: { eventId: string; onReward: (percent: number) => void }) {
  const [reward, setReward] = useState<Reward | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    fetch('/api/discount-wheel', { cache: 'no-store' }).then(r => r.json()).then(data => setReward(data.reward)).catch(() => {});
  }, []);
  useEffect(() => {
    const update = () => {
      const seconds = reward && !reward.used ? Math.max(0, Math.ceil((reward.expiresAt - Date.now()) / 1000)) : 0;
      setRemaining(seconds);
      onReward(seconds && reward ? reward.percent : 0);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [reward, onReward]);
  async function spin() {
    setSpinning(true); setError('');
    try {
      const response = await fetch('/api/discount-wheel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const index = [5, 10, 15, 20, 25].indexOf(data.reward.percent);
      setRotation(1800 + 360 - (index * 72 + 36));
      window.setTimeout(() => { setReward(data.reward); setSpinning(false); }, 4200);
    } catch (e) { setError(e instanceof Error ? e.message : 'Bitte erneut versuchen.'); setSpinning(false); }
  }
  return <section className="mt-8 rounded-xl border border-[#d6b36a]/30 bg-zinc-950 p-6 text-center">
    <p className="text-xs uppercase tracking-[.2em] text-[#d6b36a]">Nur für Nürnberg</p>
    <h2 className="mt-2 text-2xl font-semibold text-white">Dreh dir deinen Ticket-Rabatt</h2>
    <p className="mt-2 text-sm text-zinc-400">Kostenlos drehen und garantiert 5–25 % gewinnen. Kein Kauf erforderlich.</p>
    <div className="relative mx-auto my-6 h-64 w-64">
      <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl text-white">▼</div>
      <div className="relative h-full w-full rounded-full border-4 border-[#d6b36a] shadow-xl" style={{ background: 'conic-gradient(#d6b36a 0deg 72deg,#171717 72deg 144deg,#ead08d 144deg 216deg,#343434 216deg 288deg,#b88a41 288deg 360deg)', transform: `rotate(${rotation}deg)`, transition: 'transform 4.2s cubic-bezier(.12,.75,.12,1)' }}>
        {[5,10,15,20,25].map((percent,index) => <span key={percent} className="absolute left-1/2 top-1/2 text-lg font-bold" style={{ transform: `translate(-50%,-50%) rotate(${index*72+36}deg) translateY(-86px) rotate(90deg)`, color: index===1 || index===3 ? '#fff' : '#111' }}>{percent}%</span>)}
        <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#d6b36a] bg-black text-[10px] font-bold tracking-wider text-[#d6b36a]">WOLNAA</span>
      </div>
    </div>
    {!reward && <label className="mx-auto mb-4 flex max-w-md items-start gap-3 text-left text-xs leading-5 text-zinc-400"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 accent-[#d6b36a]" />Ich bin mindestens 18 Jahre alt, akzeptiere die verlinkten Teilnahmebedingungen und willige in das Aktionscookie für Gewinn und Browserbegrenzung bis spätestens 03.10.2026 ein. Keine Trackingnutzung. Widerruf durch Löschen des Cookies; dann geht ein nicht eingelöster Gewinn verloren.</label>}
    {reward ? <p className="font-semibold text-[#d6b36a]">{reward.used ? 'Dein Rabatt wurde bereits beim Checkout eingesetzt.' : remaining ? `${reward.percent} % Rabatt gewonnen! Automatisch beim Ticketkauf · noch ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}` : 'Dein Rabatt ist abgelaufen. In diesem Browser wurde bereits gedreht.'}</p> : <button disabled={spinning || !accepted} onClick={spin} className="rounded-md bg-[#d6b36a] px-8 py-3 font-bold text-black disabled:opacity-50">{spinning ? 'Das Rad dreht …' : 'Jetzt kostenlos drehen'}</button>}
    {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    <p className="mt-4 text-xs text-zinc-500">Chancen: 5 % Rabatt: 15 % · 10 %: 20 % · 15 %: 25 % · 20 %: 20 % · 25 %: 20 %. Gleich große Felder bedeuten nicht gleiche Gewinnchancen.</p>
    <a href="/gluecksrad-teilnahmebedingungen" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-[#d6b36a] underline">Teilnahmebedingungen & Datenschutz</a>
  </section>;
}
