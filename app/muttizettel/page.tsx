"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { allowsMuttizettel } from "@/lib/event-timing";
import { useEventClock } from "@/lib/use-event-clock";

type Event = { id: string; slug?: string; title: string; city: string; date: string; time: string; event_ends_at?: string; min_age?: number; description?: string; veranstalter?: { kontakt_email?: string } };
export default function MuttizettelPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const now = useEventClock();
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    fetch("/api/events", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.events)) throw new Error();
      setEvents(data.events);
      setSelected(new URLSearchParams(window.location.search).get("event") || "");
      setState("ready");
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [retry]);
  const eligible = events.filter(event => allowsMuttizettel(event, now));
  const event = eligible.find(event => event.id === selected);
  return <main className="wolnaa-info"><div className="wolnaa-info-inner">
    <Link href="/">← Zurück zu Wolnaa</Link>
    <h1>Muttizettel</h1>
    <p>Wähle deine Veranstaltung. Hier erscheinen ausschließlich aktuelle Wolnaa-Events mit Eintritt ab 16 Jahren.</p>
    {state === "loading" && <p role="status">Veranstaltungen werden geladen …</p>}
    {state === "error" && <div role="alert"><p>Die Veranstaltungen konnten nicht geladen werden.</p><button onClick={() => setRetry(value => value + 1)}>Erneut versuchen</button></div>}
    {state === "ready" && (eligible.length ? <>
      <label htmlFor="mutti-event" style={{display:"block",marginBottom:12}}>Veranstaltung auswählen</label>
      <select id="mutti-event" value={event?.id || ""} onChange={e => setSelected(e.target.value)} style={{width:"100%",padding:14,border:"1px solid #d6b36a",borderRadius:12,background:"#171717",color:"#fff",fontSize:16}}>
        <option value="">Bitte ein Event auswählen</option>
        {eligible.map(item => <option key={item.id} value={item.id}>{item.title} · {new Date(item.date + "T12:00:00").toLocaleDateString("de-DE")}</option>)}
      </select>
      {event && <section style={{marginTop:24,padding:20,border:"1px solid #d6b36a55",borderRadius:16}}>
        <h2>{event.title}</h2>
        <p>{event.city} · {new Date(event.date + "T12:00:00").toLocaleDateString("de-DE")} {event.time && `· ${event.time} Uhr`} · Eintritt ab 16</p>
        <p>Du bist 16 oder 17? Stimme die benötigte Erziehungsbeauftragung und die Begleitung vorab mit dem Veranstalter ab. Die Auswahl hier stellt noch keinen Muttizettel aus.</p>
        <p><a href={`mailto:${event.veranstalter?.kontakt_email || "kontakt@wolnaa.de"}?subject=${encodeURIComponent("Muttizettel: " + event.title)}`}>Muttizettel beim Veranstalter anfragen</a></p>
        <Link className="wolnaa-gold-button" href={`/event/${event.slug || event.id}`}>Zum Event</Link>
      </section>}
    </> : <p>Aktuell ist kein Event ab 16 Jahren freigeschaltet. Sobald ein Veranstalter ein passendes Event speichert, erscheint es hier.</p>)}
    <p>Ein Muttizettel ersetzt kein Ticket. Beachte die Einlassbedingungen des jeweiligen Veranstalters.</p>
  </div></main>;
}
