'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ImpressumPage() {
  const [text, setText] = useState('');

  useEffect(() => {
    supabaseBrowser
      .from('settings')
      .select('value')
      .eq('key', 'impressum')
      .single()
      .then(({ data }) => {
        if (data) setText(data.value);
      });
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', fontFamily: 'sans-serif', color: '#fff', background: '#000', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Impressum</h1>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#a1a1aa' }}>
        {text || 'Kein Inhalt vorhanden.'}
      </div>
    </main>
  );
}
