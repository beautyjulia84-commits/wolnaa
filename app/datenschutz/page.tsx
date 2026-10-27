'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function DatenschutzPage() {
  const [text, setText] = useState('');

  useEffect(() => {
    supabaseBrowser
      .from('legal')
      .select('content')
      .eq('key', 'datenschutz')
      .single()
      .then(({ data }) => {
        if (data) setText(data.content);
      });
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', fontFamily: 'sans-serif', color: '#fff', background: '#000', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Datenschutz</h1>
      <section style={{lineHeight:1.8,color:'#a1a1aa',marginBottom:32}}>
        <h2 style={{fontSize:22,color:'#fff'}}>Besucherstatistik und Kaufherkunft</h2>
        <p>Wir erfassen Seitenpfad, Datum, übermittelten Herkunftshinweis und die grobe Geräteklasse sowie die Anzahl der Glücksrad-Drehungen. Diese Statistik enthält keine Namen, E-Mail-Adressen oder gespeicherten IP-Adressen.</p>
        <p>Nur nach „Alle akzeptieren“ speichert das Sitzungscookie „wolnaa-source“ den Herkunftshinweis, beispielsweise Instagram oder Google. Es enthält keine Nutzerkennung und wird nicht zum seitenübergreifenden Tracking verwendet. Bei einem Ticketkauf wird die Herkunft in den Checkout-Metadaten an Stripe übermittelt und für die Kaufstatistik ausgewertet. Das Cookie hat keine feste Laufzeit und endet mit der Browsersitzung; Browser können Sitzungen wiederherstellen. Über „Cookie-Einstellungen“ auf der Startseite kann die Zustimmung widerrufen werden. Nicht zuordenbare Käufe erscheinen als „Direkt / unbekannt“.</p>
      </section>
      <section style={{lineHeight:1.8,color:'#a1a1aa',marginBottom:32}}>
        <h2 style={{fontSize:22,color:'#fff'}}>Meta-Werbemessung (Facebook und Instagram)</h2>
        <p>Nur nach deiner Zustimmung zu „Statistik & Marketing“ verwenden wir den Meta Pixel und die Conversions API von Meta Platforms Ireland Limited. Dabei können Seitenaufrufe im öffentlichen Shop sowie bestätigte, bezahlte Ticketbestellungen an Meta übermittelt werden. Kaufmeldungen enthalten Betrag, Währung, Ticketanzahl, eine pseudonyme Bestellkennung, Browserinformationen und vorhandene Werbe-/Browserkennungen (_fbp, _fbc). Namen, E-Mail-Adressen, Unterschriften und Zahlungsdaten werden durch diese Anbindung nicht an Meta gesendet. Beim Laden des Pixels erhält Meta technisch auch deine IP-Adresse.</p>
        <p>Die Kennungen dienen dazu, Käufe Werbeanzeigen zuzuordnen und deren Auslieferung zu verbessern. Die Meta-Cookies können bis zu 90 Tage bestehen; unsere Einwilligung wird für bis zu sechs Monate gespeichert. Für die serverseitige Kaufmeldung wird die beim Checkout erteilte Einwilligung zusammen mit den Kennungen in den Stripe-Checkout-Metadaten hinterlegt. Die Meldung erfolgt erst nach bestätigter Zahlung. Bereits erfolgte Übermittlungen werden durch einen späteren Widerruf nicht rückgängig gemacht.</p>
        <p>Die Zustimmung ist freiwillig und kann jederzeit über „Cookie-Einstellungen“ widerrufen werden. Eine Buchung ist auch ohne Werbetracking möglich. Meta kann Daten mit deinem Meta-Konto verknüpfen und außerhalb der EU verarbeiten. Weitere Informationen: <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Meta-Datenschutzrichtlinie</a>.</p>
      </section>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#a1a1aa' }}>
        {text || 'Kein Inhalt vorhanden.'}
      </div>
    </main>
  );
}
