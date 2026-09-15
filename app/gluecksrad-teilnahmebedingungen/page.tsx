import Link from 'next/link';
export default function WheelTerms() {
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-zinc-300">
    <Link href="/" className="text-[#d6b36a]">← WOLNAA</Link>
    <h1 className="my-8 text-3xl font-semibold text-white">Teilnahmebedingungen – Rabatt-Glücksrad Nürnberg</h1>
    <div className="space-y-5 text-sm leading-7">
      <p>Aktionsanbieter ist der im <Link className="text-[#d6b36a] underline" href="/Impressum">WOLNAA-Impressum</Link> benannte Betreiber. Kontakt: kontakt@wolnaa.de. Die Aktion gilt ausschließlich für „WOLNAA — Indoor Festival“ am 02.10.2026 in Nürnberg und endet spätestens mit dem Online-Verkaufsende dieser Veranstaltung.</p>
      <p>Teilnahme ab 18 Jahren. Ein Dreh ist kostenlos und unabhängig von einem Kauf, Newsletter-Abonnement oder einer Registrierung. Jeder erfolgreiche Dreh gewährt einen Rabatt. Es besteht keine Verpflichtung, ihn einzulösen.</p>
      <p>Gewinnchancen: 5 % Rabatt mit 15 % Wahrscheinlichkeit; 10 % mit 20 %; 15 % mit 25 %; 20 % mit 20 %; 25 % mit 20 %. Die Zufallsauswahl erfolgt auf dem Server. Das Rad enthält 20 gleich große Felder: 3 mit 5 %, 4 mit 10 %, 5 mit 15 %, 4 mit 20 % und 4 mit 25 %. Die Anzahl der jeweiligen Felder entspricht den Gewinnchancen.</p>
      <p>Ein Dreh je Browser. Die Begrenzung erfolgt technisch durch ein signiertes Cookie. Sie identifiziert keine Person und kann durch andere Browser oder das Löschen von Cookies umgangen werden. Eine gezielte Umgehung zur Mehrfachteilnahme ist nicht gestattet.</p>
      <p>Der Gewinn gilt zwei Stunden ab Ziehung und nur bis zum Online-Verkaufsende. Er wird automatisch auf die regulären Tickets eines Checkouts für diese Veranstaltung angewendet. Lounges sind ausgeschlossen. Nicht kombinierbar mit anderen Rabattcodes, nicht übertragbar, keine Barauszahlung und keine nachträgliche Anrechnung auf bestehende Käufe. Der reduzierte Gesamtpreis wird vor der Weiterleitung zu Stripe angezeigt.</p>
      <p>Der Rabatt wird bei Erstellung der Stripe-Checkout-Sitzung als eingesetzt markiert. Er gilt für diese Sitzung und kann nicht für einen zweiten Checkout verwendet werden. Bei abgebrochener oder fehlgeschlagener Zahlung kann der Support unter kontakt@wolnaa.de helfen. Bereits gewährte Ansprüche und gesetzliche Rechte bleiben unberührt.</p>
      <p>Datenschutz: Für das Rad werden keine zusätzlichen Namen oder E-Mail-Adressen erfragt. Nach deiner Einwilligung speichert ein signiertes Aktionscookie Gewinnhöhe, Ablaufzeit und Einsatzstatus zur Browserbegrenzung bis spätestens 03.10.2026. Keine Trackingnutzung. Der normale Ticketkauf bleibt auch ohne Einwilligung möglich. Die Einwilligung kann durch Löschen des Cookies widerrufen werden; damit entfällt der Zugang zum nicht eingelösten Gewinn. Die übrige Datenverarbeitung beim Ticketkauf richtet sich nach der <Link href="/datenschutz" className="text-[#d6b36a] underline">Datenschutzerklärung</Link>.</p>
      <p>Für den Ticketkauf gelten ergänzend die <Link href="/agb" className="text-[#d6b36a] underline">AGB</Link> und die Veranstaltungshinweise. Das Rad begründet keine weiteren Rücktritts- oder Erstattungsrechte. Bei technischen Problemen bitte den Support kontaktieren.</p>
    </div>
  </main>;
}
