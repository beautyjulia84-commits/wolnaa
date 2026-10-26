# Werbeverkäufe

## Stand

Die Auswertung läuft unabhängig von Meta im WOLNAA-Adminbereich. Keine Meta-Pixel- oder Conversions-API-Anbindung: Im geprüften Werbekonto 944767913810533 war keine Datenquelle verbunden, und die Einrichtung verlangte ein Business-Portfolio. Die interne Auswertung benötigt keinen Meta-Zugang.

## Nutzung

Admin → Besucher & Statistik → Ticketverkäufe durch Werbung. Zeitraum wählen, Auswertung laden, optional Event und bezahlte Werbelinks filtern. Der geschützte Endpunkt `/api/admin/ad-sales` liest alle Seiten abgeschlossener Stripe-Checkouts für den gewählten Zeitraum. Nur echte, bezahlte WOLNAA-Ticketbestellungen im Live-Modus zählen. Keine personenbezogenen Kundendaten werden an die Auswertung geliefert.

Kampagnenlinks verwenden `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`. Beispiel für die bestehende Meta-Anzeige:

`https://www.wolnaa.de/event/wolnaa-in-mnchen?utm_source=meta&utm_medium=paid_social&utm_campaign=muenchen_2026_11_06&utm_content=reel_22okt`

Nach Einwilligung wird die letzte markierte Kampagne maximal 30 Tage im HttpOnly-Cookie gespeichert und als Stripe-Checkout-Metadaten übernommen. Vor Einwilligung bleiben die Parameter nur im Arbeitsspeicher der geöffneten Seite. Ablehnung löscht das Zuordnungs-Cookie. Andere Geräte, gelöschte Cookies und fehlende Einwilligung verhindern die Zuordnung. Ohne gespeichertes Medium wird eine Quelle nicht als nachgewiesene bezahlte Werbung klassifiziert.

## Zahlungslogik

- Ticketmenge aus validierten Checkout-Positionen, Bestellungen separat.
- Wiederholte Zeilen mit derselben Checkout-ID zählen einmal.
- Vollständige Erstattungen werden ausgeschlossen.
- Teil-Erstattungen und fehlende Mengen/Erstattungsdaten werden als unklare Bestellungen ausgewiesen und nicht zur eindeutigen Ticketzahl addiert.
- Umsatz ist bezahlter Betrag abzüglich bekannter Erstattungen, vor Stripe-Gebühren. Keine Gewinnberechnung.
- Zeitraum bezieht sich auf Erstellung des Checkouts; Erstattungen entsprechen dem aktuellen Stripe-Stand.
- Kein rückwirkendes Erfinden fehlender Kampagneninformationen; keine Aussage über kausale Werbewirkung oder Meta-Sichtkontakt-Attribution.

## Veröffentlichung und Abnahme

Hosting: Vercel-Projekt `wolnaa` im Team `beautyjulia84-3391s-projects`, Produktionsdomain `wolnaa.de`. Veröffentlichung auf Basis des aktuellen GitHub-Branches `main`. Bestehende produktive Stripe-/Supabase-Umgebungsvariablen müssen beim Deployment erhalten bleiben. Stripe-Webhook muss `checkout.session.completed` und für asynchrone Zahlarten `checkout.session.async_payment_succeeded` abonnieren.

Vor Live-Abnahme in einer getrennten Stripe-Testumgebung prüfen: UTM-Landing → Marketing-Einwilligung → Checkout-Metadaten; Ablehnung → keine Kampagnen-Metadaten; Zahlungsbestätigung/erneuter Webhook → keine Doppelzählung. Der Live-Bericht schließt Testkäufe absichtlich aus. Keine kostenpflichtigen Testbestellungen ohne gesonderten Auftrag auslösen.

Automatisierte Prüfung: `node scripts/ad-sales.test.mjs`, `tsc --noEmit`; ESLint auf den neuen Komponenten und Endpunkten.
