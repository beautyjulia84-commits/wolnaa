import Link from "next/link";

export default function Loading() {
  return <main aria-busy="true" className="min-h-screen bg-black text-white">
    <div className="relative h-[68svh] min-h-[440px] max-h-[820px] bg-zinc-950 md:h-[72svh] md:min-h-[520px]">
      <div className="mx-auto max-w-3xl px-5 pt-5"><Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-white/25 px-4 py-3 text-sm">← Zurück</Link></div>
      <p role="status" className="absolute inset-x-0 bottom-10 text-center text-[#00e5eb]">Veranstaltung wird geladen …</p>
    </div>
  </main>;
}

