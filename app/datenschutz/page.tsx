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
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#a1a1aa' }}>
        {text || 'Kein Inhalt vorhanden.'}
      </div>
    </main>
  );
}
