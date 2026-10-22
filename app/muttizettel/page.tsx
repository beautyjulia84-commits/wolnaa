"use client";
import Link from "next/link";
import CustomerPageShell from "@/components/CustomerPageShell";
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
  return <CustomerPageShell>
    <p className="wolnaa-customer-kicker">Muttizettel</p>
    <h1>Gemeinsam<br />zum Event.</h1>
    <p className="wolnaa-customer-intro">Für 16- und 17-Jährige bei freigeschalteten Wolnaa-Veranstaltungen.</p>
    <label htmlFor="mutti-event">Veranstaltung auswählen</label>
    <div className="wolnaa-customer-select">
      <select id="mutti-event" disabled={state !== "ready" || !eligible.length} aria-busy={state === "loading"} aria-describedby="mutti-status" value={event?.id || ""} onChange={e => setSelected(e.target.value)}>
        <option value="">{state !== "ready" || eligible.length ? "Veranstaltung auswählen" : "Keine Events ab 16 verfügbar"}</option>
        {eligible.map(item => <option key={item.id} value={item.id}>{item.title} · {new Date(item.date + "T12:00:00").toLocaleDateString("de-DE")}</option>)}
      </select><span aria-hidden="true">⌄</span>
    </div>
    <div id="mutti-status" className="wolnaa-customer-status" role="status">
      {state === "loading" ? "Verfügbarkeit wird geprüft …" : state === "error" ? "Events konnten nicht geladen werden." : !eligible.length ? "Aktuell ist keine Veranstaltung ab 16 freigeschaltet." : "Wähle das Event, das du besuchen möchtest."}
    </div>
    {state === "error" && <button className="wolnaa-account-button" onClick={() => setRetry(value => value + 1)}>Erneut versuchen</button>}
      {event && <section style={{marginTop:24,padding:20,border:"1px solid #d6b36a55",borderRadius:16}}>
        <h2>{event.title}</h2>
        <p>{event.city} · {new Date(event.date + "T12:00:00").toLocaleDateString("de-DE")} {event.time && `· ${event.time} Uhr`} · Eintritt ab 16</p>
        <p>Du bist 16 oder 17? Stimme die benötigte Erziehungsbeauftragung und die Begleitung vorab mit dem Veranstalter ab. Die Auswahl hier stellt noch keinen Muttizettel aus.</p>
        <p><a href={`mailto:${event.veranstalter?.kontakt_email || "kontakt@wolnaa.de"}?subject=${encodeURIComponent("Muttizettel: " + event.title)}`}>Muttizettel beim Veranstalter anfragen</a></p>
        <Link className="wolnaa-gold-button" href={`/event/${event.slug || event.id}`}>Zum Event</Link>
      </section>}
    <div className="wolnaa-customer-help"><span>Gut zu wissen</span><p>Ein Muttizettel ersetzt weder dein Ticket noch die Ausweis- und Begleitpersonenprüfung am Einlass. Es gelten die Regeln des Veranstalters.</p></div>
  </CustomerPageShell>;
}
