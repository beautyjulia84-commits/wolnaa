import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { withEventSchedules } from "@/lib/event-schedules";
import EventDetails, { type EventItem } from "./EventDetails";

// Keep sales deadlines and organizer edits fresh on every page request.
export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let event: EventItem | undefined;
  try {
    const { data, error } = await supabase.from("events")
      .select("id,slug,title,city,date,time,online_sale_ends_at,location,address,image_url,price,description,tickets,lounges,lounge_list,discount_codes,veranstalter_id,veranstalter:veranstalter_id(firmenname,kontakt_email)")
      .eq("slug", id).limit(1);
    if (error) throw error;
    const rows = await withEventSchedules(supabase, data || []);
    event = rows[0] as unknown as EventItem | undefined;
  } catch {
    return <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl text-[#d6b36a]">Event gerade nicht erreichbar</h1>
      <p>Bitte versuche es noch einmal.</p>
      <a href={`/event/${encodeURIComponent(id)}`} className="text-[#d6b36a] underline">Erneut laden</a>
      <Link href="/">Zur Startseite</Link>
    </main>;
  }
  if (!event) return <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
    <h1 className="text-2xl text-[#d6b36a]">Event nicht gefunden</h1>
    <Link href="/">← Zur Startseite</Link>
  </main>;
  return <EventDetails key={event.id} event={event} initialNow={Date.now()} />;
}
