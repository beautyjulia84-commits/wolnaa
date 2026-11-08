"use client";

import type { TableReservation } from "@/lib/table-reservations";

function tablePrice(table: TableReservation) {
  return table.tablePrice === 0 ? "kostenlos" : `${table.tablePrice} €`;
}

type Props = {
  tables: TableReservation[];
  reservedIds: string[];
  selectedId: string | null;
  onSelect: (table: TableReservation) => void;
  variant?: "preview" | "picker";
};

export default function TablePlan({ tables, reservedIds, selectedId, onSelect, variant = "picker" }: Props) {
  const preview = variant === "preview";
  return (
    <section className={preview ? "overflow-hidden rounded-2xl border border-[#d6b36a]/35 bg-[#070707] shadow-[0_20px_55px_rgba(0,0,0,.42)]" : "overflow-hidden rounded-xl border border-white/10 bg-[#070707]"}>
      {preview && <div className="border-b border-white/10 px-5 py-5 sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d6b36a]">Tischreservierung</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Dein Tisch</h2><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">Bereich im Saal antippen, Personen wählen und deinen Tisch verbindlich reservieren.</p></div>}
      <div className="relative aspect-[0.61] min-h-[430px] overflow-hidden bg-black">
        <img src="/wernau-floor-plan.png" alt="Saalplan des WOLNAA Grand Openings in Wernau mit Lounge-, Stehtisch- und VIP-Bereichen" className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-[7%] bottom-[7%] h-[13%] rounded-[50%] bg-[#d6b36a]/10 blur-3xl" aria-hidden="true" />
        {tables.map((table) => {
          const reserved = reservedIds.includes(table.id);
          const selected = selectedId === table.id;
          return <button key={table.id} type="button" disabled={reserved} onClick={() => onSelect(table)} aria-pressed={selected} aria-label={`${table.name}: ${reserved ? "bereits reserviert" : `${tablePrice(table)}, ${table.minGuests} bis ${table.maxGuests} Personen`}`} style={{ left: table.mapPosition.left, top: table.mapPosition.top }} className={`absolute z-10 min-h-11 -translate-x-1/2 -translate-y-1/2 border px-2.5 py-2 text-center text-[9px] font-extrabold uppercase leading-tight tracking-wide outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-3 sm:text-[11px] ${table.zone === "standing" ? "rounded-full" : "rounded-xl"} ${reserved ? "cursor-not-allowed border-zinc-600 bg-black/90 text-zinc-500 line-through" : selected ? "scale-110 border-[#fff0b2] bg-[#d6b36a] text-black shadow-[0_0_30px_rgba(214,179,106,.95)]" : "border-[#d6b36a]/90 bg-black/85 text-[#f7dc9b] shadow-[0_6px_18px_rgba(0,0,0,.55)] hover:scale-105 hover:bg-[#d6b36a] hover:text-black active:scale-95"}`}><span className="block whitespace-nowrap">{table.name}</span><span className="mt-0.5 block text-[8px] font-semibold normal-case tracking-normal opacity-85 sm:text-[9px]">{reserved ? "reserviert" : tablePrice(table)}</span></button>;
        })}
      </div>
      {preview && <div className="grid gap-2 border-t border-white/10 p-4 text-xs sm:grid-cols-3 sm:p-5"><p className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-zinc-300"><span className="font-bold text-[#e5c980]">Stehtisch</span><br />kostenlos · zzgl. Eintritt</p><p className="rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-zinc-300"><span className="font-bold text-[#e5c980]">Lounge</span><br />250 € · 4–8 Personen · 2 Flaschen</p><p className="rounded-lg border border-white/10 bg-black/35 px-3 text-zinc-300"><span className="font-bold text-[#e5c980]">VIP Lounge</span><br />500 € · 10–20 Personen · 4 Flaschen</p></div>}
    </section>
  );
}
