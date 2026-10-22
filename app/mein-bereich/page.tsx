import Link from "next/link";
export default function MeinBereich() {
  return <main className="wolnaa-info"><div className="wolnaa-info-inner">
    <Link href="/">← Zurück zu Wolnaa</Link>
    <h1>Mein Bereich</h1>
    <h2>Deine Tickets</h2>
    <p>Nach dem Kauf erhältst du deine Tickets per E-Mail. Öffne den Ticketlink in deiner Bestätigung, um sie aufzurufen.</p>
    <p>Keine E-Mail erhalten? Prüfe auch deinen Spam-Ordner. Bei Fragen zur Bestellung erreichst du uns unter <a href="mailto:kontakt@wolnaa.de">kontakt@wolnaa.de</a>.</p>
    <h2>Für Veranstalter</h2>
    <p>Verwalte deine Veranstaltungen und Ticketverkäufe im Veranstalterbereich.</p>
    <Link href="/veranstalter/login" className="wolnaa-gold-button">Als Veranstalter anmelden</Link>
  </div></main>;
}
