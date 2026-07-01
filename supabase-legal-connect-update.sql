-- Wolnaa Rechtstexte fuer Veranstalter + Stripe Connect Standard
-- Im Supabase SQL Editor ausfuehren.
-- Hinweis: Dies ist eine technische Vorlage und ersetzt keine anwaltliche Pruefung.

INSERT INTO legal (key, content)
VALUES
(
  'agb',
  $$Allgemeine Geschaeftsbedingungen (AGB) fuer Wolnaa

Stand: Juli 2026

1. Geltungsbereich
Diese AGB gelten fuer die Nutzung der Ticketplattform Wolnaa und fuer den Erwerb von Tickets ueber Wolnaa. Wolnaa stellt die technische Plattform, die Ticketabwicklung, den Versand digitaler Tickets und den Check-in per QR-Code bereit.

2. Vertragspartner bei Veranstaltungen
Bei Veranstaltungen, die von einem Veranstalter ueber Wolnaa angeboten werden, kommt der Vertrag ueber die Teilnahme an der Veranstaltung grundsaetzlich zwischen dem Kunden und dem jeweiligen Veranstalter zustande. Der jeweilige Veranstalter ist auf der Veranstaltungsseite bzw. im Checkout ausgewiesen.

Wolnaa ist in diesen Faellen Plattform- und Ticketdienstleister, jedoch nicht automatisch selbst Veranstalter der Veranstaltung. Bei eigenen Wolnaa-Veranstaltungen ist Wolnaa selbst Veranstalter.

3. Angaben zu Veranstaltungen
Der jeweilige Veranstalter ist fuer die Richtigkeit und Vollstaendigkeit seiner Veranstaltungsangaben verantwortlich, insbesondere fuer Datum, Uhrzeit, Ort, Preise, Ticketkontingente, Altersbeschraenkungen, Einlassbedingungen, Programm, Absagen und Verlegungen.

4. Ticketkauf und Vertragsschluss
Der Kunde waehlt Tickets aus, gibt seine Kundendaten ein und schliesst die Bestellung ueber die angebotene Zahlungsart ab. Nach erfolgreicher Zahlung erhaelt der Kunde sein Ticket digital per E-Mail. Das Ticket enthaelt einen QR-Code und ist beim Einlass vorzuzeigen.

5. Preise, Gebuehren und Zahlungsabwicklung
Alle angegebenen Preise verstehen sich inklusive der jeweils geltenden gesetzlichen Umsatzsteuer, sofern diese anfaellt. Die Zahlungsabwicklung erfolgt ueber den Zahlungsdienstleister Stripe.

Bei Veranstaltungen von verbundenen Veranstaltern kann die Zahlung dem Stripe-Konto des jeweiligen Veranstalters zugeordnet werden. Wolnaa kann eine Plattformgebuehr einbehalten oder abrechnen. Stripe kann eigene Zahlungs- und Abwicklungsbedingungen anwenden.

6. Rueckerstattungen, Stornierungen, Absagen und Verlegungen
Rueckerstattungen, Stornierungen, Absagen oder Verlegungen richten sich nach den Bedingungen des jeweiligen Veranstalters und den gesetzlichen Vorgaben. Der Veranstalter ist grundsaetzlich fuer Entscheidungen ueber Rueckerstattungen, Absagen und Verlegungen verantwortlich, sofern Wolnaa nicht selbst Veranstalter ist.

Bei Rueckerstattungen kann es je nach Zahlungsart, Bank oder Stripe-Abwicklung einige Werktage dauern, bis der Betrag beim Kunden sichtbar ist.

7. Einlass und Hausrecht
Der Einlass erfolgt gegen Vorlage eines gueltigen Tickets bzw. QR-Codes. Der Veranstalter oder die von ihm beauftragten Personen koennen den QR-Code beim Einlass scannen und den Check-in dokumentieren. Das Hausrecht am Veranstaltungsort bleibt unberuehrt.

Der Veranstalter kann den Einlass verweigern, wenn gesetzliche Vorgaben, Altersbeschraenkungen, Sicherheitsgruende, Hausordnung oder sonstige berechtigte Gruende entgegenstehen.

8. Weitergabe und Missbrauch von Tickets
Tickets duerfen nicht missbraeuchlich vervielfaeltigt oder mehrfach verwendet werden. Bei mehrfach vorgelegten Tickets kann nur der erste erfolgreiche Scan zum Einlass berechtigen.

9. Pflichten der Veranstalter
Veranstalter muessen wahrheitsgemaesse Angaben machen, ausreichende Rechte an Bildern, Texten und Veranstaltungsinhalten besitzen und ein eigenes Stripe-Konto verbinden, wenn sie Zahlungen direkt erhalten sollen. Veranstalter duerfen keine fremden Stripe-Konten ohne Berechtigung verwenden.

Veranstalter sind fuer steuerliche Pflichten, Rechnungslegung, Rueckerstattungen, Veranstaltungsdurchfuehrung, rechtliche Genehmigungen und die Kommunikation mit Kunden verantwortlich, soweit sie die Veranstaltung anbieten.

10. Haftung
Wolnaa haftet fuer eigene Pflichtverletzungen nach den gesetzlichen Vorschriften. Soweit Wolnaa lediglich Plattform- und Ticketdienstleister ist, haftet Wolnaa nicht fuer die Durchfuehrung, Qualitaet, Absage, Verlegung oder Inhalte einer Veranstaltung des jeweiligen Veranstalters.

11. Datenschutz
Informationen zur Verarbeitung personenbezogener Daten, zur Weitergabe an Veranstalter, zur Zahlungsabwicklung ueber Stripe, zum E-Mail-Versand und zum QR-Code-Check-in ergeben sich aus der Datenschutzerklaerung.

12. Schlussbestimmungen
Es gilt deutsches Recht, soweit keine zwingenden Verbraucherschutzvorschriften entgegenstehen. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt.$$ 
),
(
  'datenschutz',
  $$Datenschutzerklaerung fuer Wolnaa

Stand: Juli 2026

1. Verantwortliche Stelle
Verantwortlich fuer die Datenverarbeitung auf der Plattform Wolnaa ist der im Impressum genannte Betreiber von Wolnaa. Bei Veranstaltungen externer Veranstalter kann der jeweilige Veranstalter fuer bestimmte Verarbeitungsvorgaenge ebenfalls verantwortlich sein, insbesondere fuer Teilnehmerlisten, Einlasskontrolle, Rueckerstattungen und veranstaltungsbezogene Kommunikation.

2. Verarbeitete Daten
Wolnaa verarbeitet insbesondere folgende Daten:
- Name und E-Mail-Adresse des Ticketkaeufers
- ausgewaehlte Tickets, Ticketarten, Preise und Rabattcodes
- Zahlungsstatus und Transaktionsinformationen
- Ticket-ID, QR-Code und Check-in-Status
- technische Zugriffsdaten, soweit fuer Betrieb und Sicherheit erforderlich

3. Zwecke der Verarbeitung
Die Daten werden verarbeitet, um Tickets zu verkaufen, Zahlungen abzuwickeln, digitale Tickets per E-Mail zu versenden, den Einlass per QR-Code zu ermoeglichen, Rueckerstattungen und Support zu bearbeiten und die Plattform technisch sicher zu betreiben.

4. Weitergabe an Veranstalter
Bei Veranstaltungen externer Veranstalter werden die fuer die Durchfuehrung der Veranstaltung erforderlichen Kundendaten an den jeweiligen Veranstalter uebermittelt oder im Veranstalterbereich bereitgestellt. Dazu koennen Name, E-Mail-Adresse, Ticketart, Zahlungsstatus, Ticket-ID und Check-in-Status gehoeren.

Der Veranstalter nutzt diese Daten insbesondere fuer Teilnehmerlisten, Einlasskontrolle, Kundenkommunikation zur Veranstaltung, Rueckerstattungen, Absagen oder Verlegungen.

5. Zahlungsabwicklung ueber Stripe
Zahlungen werden ueber Stripe abgewickelt. Je nach Veranstaltung kann die Zahlung einem verbundenen Stripe-Konto des jeweiligen Veranstalters zugeordnet werden. Stripe verarbeitet Zahlungsdaten in eigener Verantwortung bzw. im Rahmen der Stripe-Dienste. Es gelten zusaetzlich die Datenschutz- und Nutzungsbedingungen von Stripe.

6. E-Mail-Versand
Wolnaa versendet Bestellbestaetigungen, Tickets und veranstaltungsbezogene E-Mails. Fuer den E-Mail-Versand kann ein externer Dienstleister wie Resend eingesetzt werden. Dabei werden insbesondere E-Mail-Adresse, Name, Ticketdaten und Nachrichteninhalte verarbeitet.

7. QR-Code und Check-in
Tickets enthalten einen QR-Code. Beim Einlass kann der QR-Code gescannt werden. Dabei wird geprueft, ob das Ticket gueltig ist, und der Check-in-Status kann gespeichert werden. So soll verhindert werden, dass Tickets mehrfach verwendet werden.

8. Rechtsgrundlagen
Die Verarbeitung erfolgt insbesondere zur Vertragserfuellung, zur Durchfuehrung vorvertraglicher Massnahmen, zur Erfuellung rechtlicher Pflichten sowie auf Grundlage berechtigter Interessen am sicheren Betrieb der Plattform, der Betrugsvermeidung und der Veranstaltungsabwicklung.

9. Speicherdauer
Personenbezogene Daten werden nur so lange gespeichert, wie es fuer Ticketabwicklung, Nachweise, steuerliche oder gesetzliche Aufbewahrungspflichten, Support, Rueckerstattungen oder berechtigte Interessen erforderlich ist.

10. Rechte der betroffenen Personen
Betroffene Personen haben nach Massgabe der gesetzlichen Vorschriften Rechte auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit und Widerspruch. Ausserdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehoerde.

11. Kontakt
Anfragen zum Datenschutz koennen an die im Impressum genannte Kontaktadresse von Wolnaa gerichtet werden. Bei veranstaltungsbezogenen Fragen kann zusaetzlich der jeweilige Veranstalter zustaendig sein.$$ 
)
ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content;
