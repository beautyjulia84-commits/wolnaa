'use client';
import { useState } from 'react';

type Row = { id: string; created: number; code: string; tickets: number | null; refund: string; amount: number; currency: string };
export default function PromoReport() {
  const [code, setCode] = useState('einfachwowa');
  const [eventId, setEventId] = useState('d3a2c95d-893d-4ee4-8645-b28ec7f61063');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState('');
  async function run(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setComplete(false); setRows([]);
    const asOf = String(Math.floor(Date.now() / 1000));
    let cursor = '', scanned = 0;
    const found = new Map<string, Row>();
    const cursors = new Set<string>();
    try {
      do {
        setMessage(`${scanned} abgeschlossene Checkouts geprüft …`);
        const params = new URLSearchParams({ code: code.trim(), eventId: eventId.trim(), asOf, ...(cursor ? { cursor } : {}) });
        const response = await fetch(`/api/admin/promo-report?${params}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Auswertung fehlgeschlagen.');
        for (const row of data.rows) found.set(row.id, row);
        scanned += data.scanned;
        cursor = data.next || '';
        if (cursor && cursors.has(cursor)) throw new Error('Seitennavigation fehlgeschlagen. Ergebnis unvollständig.');
        cursors.add(cursor);
      } while (cursor);
      setRows([...found.values()]); setComplete(true);
      setMessage(`Vollständig: ${scanned} abgeschlossene Checkouts geprüft. Stand ${new Date(Number(asOf) * 1000).toLocaleString('de-DE')}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Auswertung fehlgeschlagen.'); }
    finally { setBusy(false); }
  }
  const sum = (list: Row[]) => list.reduce((n, row) => n + (row.tickets || 0), 0);
  return <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950"><div className="mx-auto max-w-4xl">
    <a href="/admin" className="underline">← Adminbereich</a><h1 className="my-6 text-2xl font-bold">Promocode-Auswertung</h1>
    <p>Bezahlte Live-Bestellungen, einschließlich Kombinationen mit dem Glücksrad. Standardveranstaltung: NEXTIME / WOLNAA Indoor Festival am 02.10.2026.</p>
    <form onSubmit={run} className="my-6 grid gap-4"><label>Promocode<input required disabled={busy} value={code} onChange={e => setCode(e.target.value)} className="block w-full rounded border p-3" /></label><label>Veranstaltungs-ID<input required disabled={busy} value={eventId} onChange={e => setEventId(e.target.value)} className="block w-full rounded border p-3" /></label><button disabled={busy} className="rounded bg-amber-600 p-3 text-white disabled:opacity-50">{busy ? 'Wird ausgewertet …' : 'Verkäufe auswerten'}</button></form>
    <p role="status">{message}</p>
    {complete && <section className="my-6 space-y-4"><h2 className="text-xl font-bold">{sum(rows)} Tickets in {rows.length} bezahlten Bestellungen vor Erstattungen</h2>
      <p>Ohne Erstattung: {sum(rows.filter(row => row.refund === 'none'))} Tickets. Vollständig erstattet: {sum(rows.filter(row => row.refund === 'full'))} Tickets.</p>
      <p>Teilweise erstattete Bestellungen: {rows.filter(row => row.refund === 'partial').length}. Erstattungsstatus unbekannt: {rows.filter(row => row.refund === 'unknown').length}. Bestellungen ohne auswertbare Ticketmenge: {rows.filter(row => row.tickets === null).length} (nicht in der Ticketzahl enthalten).</p>
      <p>Bei Teil-Erstattungen lässt sich die verbleibende Ticketmenge nicht zuverlässig aus dem Erstattungsbetrag bestimmen.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Datum</th><th>Code</th><th>Tickets</th><th>Bestellbetrag</th><th>Erstattung</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="py-3">{new Date(row.created * 1000).toLocaleString('de-DE')}</td><td>{row.code}</td><td>{row.tickets ?? 'Unbekannt'}</td><td>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: row.currency || 'EUR' }).format(row.amount / 100)}</td><td>{{none:'Keine',full:'Vollständig',partial:'Teilweise',unknown:'Unbekannt'}[row.refund]}</td></tr>)}</tbody></table></div>
    </section>}
  </div></main>;
}
