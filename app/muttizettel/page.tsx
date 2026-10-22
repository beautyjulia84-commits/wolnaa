import Link from "next/link";
export default function MuttizettelPage() {
  return <main className="wolnaa-info"><div className="wolnaa-info-inner">
    <Link href="/">← Zurück zu Wolnaa</Link>
    <h1>Muttizettel</h1>
    <p>Hier findest du die Hinweise zum Muttizettel für Wolnaa-Veranstaltungen.</p>
    <h2>Eintritt und Altersgrenze</h2>
    <p>Für die derzeit angebotenen Wolnaa-Tickets gilt Eintritt ab 18 Jahren. Ein Muttizettel ermöglicht keinen Eintritt zu diesen Veranstaltungen für Personen unter 18.</p>
    <p>Aktuell ist bei Wolnaa kein digitales Muttizettel-Formular freigeschaltet.</p>
    <Link href="/#events" className="wolnaa-gold-button">Veranstaltungen ansehen</Link>
    <p>Fragen zur Einlassregelung? <a href="mailto:kontakt@wolnaa.de">kontakt@wolnaa.de</a></p>
  </div></main>;
}
