"use client";

import type { TableReservation } from "@/lib/table-reservations";

function price(table: TableReservation) { return table.tablePrice === 0 ? "Kostenlos" : String(table.tablePrice) + " €"; }
function stateClass(reserved: boolean, selected: boolean) {
  const base = "absolute z-10 min-h-11 -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-wide shadow-lg outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-xs ";
  if (reserved) return base + "cursor-not-allowed border-zinc-600 bg-black/85 text-zinc-500 line-through";
  if (selected) return base + "scale-110 border-[#fff0b2] bg-[#d6b36a] text-black shadow-[0_0_26px_rgba(214,179,106,.8)]";
  return base + "border-[#d6b36a] bg-black/85 text-[#f7dc9b] hover:scale-105 hover:bg-[#d6b36a] hover:text-black";
}

export default function TablePlan({ tables, reservedIds, selectedId, onSelect }: { tables: TableReservation[]; reservedIds: string[]; selectedId: string | null; onSelect: (table: TableReservation) => void; }) {
  return <section className="overflow-hidden rounded-xl border border-[#d6b36a]/35 bg-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,.35)]">
    <div className="border-b border-white/10 px-5 py-5 sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d6b36a]">Wernau · Tischreservierung</p><h2 className="mt-2 text-xl font-semibold text-white">Dein Platz für die Nacht</h2><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">Wähle einen verfügbaren Bereich im Saalplan. Der Eintritt wird mit 10 € pro Person direkt mitgebucht.</p></div>
    <div className="relative min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_50%_46%,rgba(61,91,32,.66),transparent_26%),linear-gradient(135deg,#17130d,#020202_54%,#151009)]">
      <div className="absolute inset-x-[20%] top-[8%] h-14 rounded border border-[#d6b36a]/45 bg-black/45 pt-5 text-center text-xs font-bold tracking-[.22em] text-[#f7dc9b]">DANCEFLOOR</div><div className="absolute right-[6%] top-[8%] h-20 w-[37%] rounded border border-[#d6b36a]/35 bg-black/50 pt-8 text-center text-xs font-bold tracking-[.18em] text-zinc-300">WC</div><div className="absolute right-[5%] top-[32%] h-28 w-[28%] rounded border border-[#d6b36a]/45 bg-black/60 pt-12 text-center text-xs font-bold tracking-[.18em] text-[#f7dc9b]">DJ</div><div className="absolute right-[7%] top-[52%] h-36 w-[39%] rounded-[2rem] border border-[#d6b36a]/50 bg-black/55 pt-14 text-center text-base font-bold tracking-[.18em] text-[#f7dc9b]">BAR</div><div className="absolute bottom-[5%] right-[6%] h-28 w-[43%] rounded border border-[#d6b36a]/50 bg-black/65 pt-12 text-center text-xs font-bold tracking-[.16em] text-[#f7dc9b]">VIP LOUNGE</div><div className="absolute bottom-[5%] left-[5%] h-28 w-[30%] rounded border border-white/15 bg-black/65 pt-12 text-center text-xs font-bold tracking-[.16em] text-zinc-400">GARDEROBE</div>
      {tables.map((table) => { const reserved = reservedIds.includes(table.id); const selected = selectedId === table.id; return <button key={table.id} type="button" disabled={reserved} onClick={() => onSelect(table)} aria-pressed={selected} aria-label={table.name + ": " + (reserved ? "bereits reserviert" : price(table) + ", " + table.minGuests + " bis " + table.maxGuests + " Personen")} style={{ left: table.mapPosition.left, top: table.mapPosition.top }} className={stateClass(reserved, selected)}><span className="block">{table.name}</span><span className="block text-[9px] font-semibold normal-case tracking-normal opacity-85">{reserved ? "reserviert" : price(table)}</span></button>; })}
    </div>
    <div className="grid gap-2 border-t border-white/10 p-4 text-xs sm:grid-cols-3 sm:p-5"><p className="rounded-md border border-white/10 bg-black/35 px-3 py-2 text-zinc-300"><span className="font-bold text-[#d6b36a]">Stehtisch</span><br />kostenlos · zzgl. Eintritt</p><p className="rounded-md border border-white/10 bg-black/35 px-3 py-2 text-zinc-300"><span className="font-bold text-[#d6b36a]">Lounge</span><br />250 € · 4–8 Personen</p><p className="rounded-md border border-white/10 bg-black/35 px-3 py-2 text-zinc-300"><span className="font-bold text-[#d6b36a]">VIP Lounge</span><br />500 € · 10–20 Personen</p></div>
  </section>;
}
