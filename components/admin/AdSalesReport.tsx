'use client';
import {useEffect,useRef,useState} from 'react';
import {summarizeAdSales,type AdSale} from '@/lib/ad-sales';

export default function AdSalesReport({token}:{token?:string}) {
  const [days,setDays] = useState('30');
  const [rows,setRows] = useState<AdSale[] | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [event,setEvent] = useState('');
  const [paidOnly,setPaidOnly] = useState(false);
  const [stand,setStand] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(),[]);
  async function load() {
    controller.current?.abort();
    const abort = new AbortController(); controller.current=abort;
    setBusy(true);setError('');setRows(null);
    const to=Math.floor(Date.now()/1000),from=to-Number(days)*86400;
    const found = new Map<string,AdSale>(),seen=new Set<string>();
    let cursor='';
    try {
      do {
        const params=new URLSearchParams({from:String(from),to:String(to),...(cursor?{cursor}:{})});
        const response=await fetch(`/api/admin/ad-sales?${params}`,{cache:'no-store',signal:abort.signal,headers:token?{'x-admin-token':token}:undefined});
        const data=await response.json();
        if (!response.ok) throw new Error(data.error || 'Auswertung fehlgeschlagen.');
        for (const row of data.rows) found.set(row.id,row);
        cursor=data.next || '';
        if (cursor && seen.has(cursor)) throw new Error('Unvollständige Auswertung. Bitte erneut laden.');
        seen.add(cursor);
      } while(cursor);
      if (!abort.signal.aborted) {setRows([...found.values()]);setStand(new Date(to*1000).toLocaleString('de-DE'));}
    } catch(e) {if (!abort.signal.aborted) setError(e instanceof Error?e.message:'Auswertung fehlgeschlagen.');}
    finally {if (!abort.signal.aborted) setBusy(false);}
  }
  const selected=(rows || []).filter(row=>(!event || row.eventId===event) && (!paidOnly || row.paidAd));
  const groups=summarizeAdSales(selected);
  return <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm">
    <h2 className="text-lg font-bold">Ticketverkäufe durch Werbung</h2>
    <p className="mt-2 text-sm text-zinc-600">Bestätigte Online-Zahlungen aus Stripe, nach Event, Quelle, Kampagne und Werbemotiv. Keine Klicks oder bloßen Checkout-Aufrufe.</p>
    <div className="my-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">Bestellungen aus den letzten<select className="mt-1 block min-h-11 rounded-lg border border-zinc-300 p-2" value={days} onChange={e=>{setDays(e.target.value);setRows(null);}} disabled={busy}><option value="7">7 Tagen</option><option value="30">30 Tagen</option><option value="90">90 Tagen</option><option value="365">365 Tagen</option></select></label>
      <button className="min-h-11 rounded-lg bg-[#d6b36a] px-4 font-semibold disabled:opacity-50" onClick={()=>void load()} disabled={busy}>{busy?'Zahlungen werden geprüft …':'Auswertung laden'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {busy && <p role="status" className="text-sm">Alle Ergebnisseiten werden geladen. Erst danach erscheinen vollständige Zahlen.</p>}
    {rows !== null && <>
      <label className="block text-sm">Veranstaltung<select className="my-2 block min-h-11 w-full rounded-lg border border-zinc-300 p-2" value={event} onChange={e=>setEvent(e.target.value)}><option value="">Alle Veranstaltungen</option>{[...new Map(rows.map(row=>[row.eventId,row.eventTitle])).entries()].map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={paidOnly} onChange={e=>setPaidOnly(e.target.checked)}/>Nur als bezahlte Werbung markierte Links</label>
      <div className="my-4 rounded-lg bg-zinc-50 p-4"><strong className="text-2xl">{groups.reduce((sum,g)=>sum+g.tickets,0)}</strong> eindeutig gezählte, nicht erstattete Tickets</div>
      {!groups.length && <p className="text-sm">Keine bestätigten Käufe für diese Auswahl gefunden.</p>}
      <ul className="grid gap-3 md:grid-cols-2">{groups.map((g,index)=><li key={index} className="min-w-0 rounded-xl border border-zinc-200 p-4">
        <p className="font-bold break-words">{g.eventTitle}</p><p className="mt-1 text-sm break-words">{g.source} · {g.paidAd?'Werbung':'Quelle ohne eindeutige Werbekennzeichnung'}</p>
        <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-zinc-500">Kampagne / Motiv</dt><dd className="break-all">{g.campaign || 'Nicht gespeichert'} / {g.content || 'Nicht gespeichert'}</dd></div><div><dt className="text-zinc-500">Tickets / Bestellungen</dt><dd className="font-semibold">{g.tickets} / {g.orders}</dd></div><div><dt className="text-zinc-500">Bezahlter Betrag abzüglich bekannter Erstattungen</dt><dd>{new Intl.NumberFormat('de-DE',{style:'currency',currency:g.currency}).format(g.revenue/100)}</dd></div></dl>
        {g.refunded>0 && <p className="mt-2 text-xs">{g.refunded} vollständig erstattete Tickets ausgeschlossen.</p>}
        {g.uncertain>0 && <p className="mt-2 text-sm text-amber-800">{g.uncertain} Bestellungen separat zu prüfen: Teil-Erstattung oder fehlende Mengen-/Erstattungsdaten. Nicht in der eindeutigen Ticketzahl enthalten.</p>}
      </li>)}</ul>
      <p className="mt-4 text-xs text-zinc-500">Stand: {stand}. Zeitraum bezieht sich auf den Beginn der Bestellung. Gästetickets und Testzahlungen sind ausgeschlossen.</p>
    </>}
    <p className="mt-4 text-xs leading-5 text-zinc-500">Zuordnung zum zuletzt aufgerufenen markierten Kampagnenlink innerhalb von 30 Tagen, nur nach Einwilligung und im selben Browser. Frühere Käufe ohne gespeicherte Kampagne bleiben unzugeordnet. Die Zuordnung belegt den Werbekontakt, nicht dessen alleinige Ursache. Zahlen können von Meta abweichen.</p>
  </section>;
}
