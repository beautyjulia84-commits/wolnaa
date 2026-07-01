'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string };
type DiscountCode = { code: string; percent: string };

type EventFormState = {
  id?: string;
  title: string;
  city: string;
  date: string;
  time: string;
  onlineSaleEndsAt: string;
  location: string;
  address: string;
  imageUrl: string;
  description: string;
  tickets: TicketType[];
  lounges: boolean;
  loungeList: Lounge[];
  discountCodes: DiscountCode[];
};

const emptyEvent: EventFormState = {
  title: '',
  city: '',
  date: '',
  time: '',
  onlineSaleEndsAt: '',
  location: '',
  address: '',
  imageUrl: '',
  description: '',
  tickets: [{ name: 'Standard', price: '', quantity: '' }],
  lounges: false,
  loungeList: [],
  discountCodes: [],
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#111',
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const labelStyle = {
  display: 'block' as const,
  fontWeight: '600' as const,
  fontSize: '12px',
  color: '#374151',
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
};

function getVeranstalterId() {
  const cookieVid = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('veranstalter_id='))?.split('=')[1];
  return cookieVid || localStorage.getItem('veranstalter_id');
}

function rowToForm(row: any): EventFormState {
  return {
    id: row.id,
    title: row.title || '',
    city: row.city || '',
    date: row.date || '',
    time: row.time || '',
    onlineSaleEndsAt: row.online_sale_ends_at ? new Date(row.online_sale_ends_at).toISOString().slice(0, 16) : '',
    location: row.location || '',
    address: row.address || '',
    imageUrl: row.image_url || '',
    description: row.description || '',
    tickets: Array.isArray(row.tickets) && row.tickets.length ? row.tickets : [{ name: 'Standard', price: row.price || '', quantity: '' }],
    lounges: !!row.lounges,
    loungeList: Array.isArray(row.lounge_list) ? row.lounge_list : [],
    discountCodes: Array.isArray(row.discount_codes) ? row.discount_codes : [],
  };
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/veranstalter/upload-image', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Bild konnte nicht hochgeladen werden.');
  }

  return data.url;
}

export default function VeranstalterEventForm({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<EventFormState>(emptyEvent);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!eventId);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const setField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!eventId) return;

    async function load() {
      try {
        const veranstalterId = getVeranstalterId();
        if (!veranstalterId) {
          window.location.href = '/veranstalter/login';
          return;
        }

        const res = await fetch(`/api/veranstalter/events?id=${encodeURIComponent(eventId!)}&vid=${encodeURIComponent(veranstalterId)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Event konnte nicht geladen werden.');
          return;
        }

        setForm(rowToForm(data.event));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId]);

  const setTicket = (index: number, key: keyof TicketType, value: string) => {
    const tickets = [...form.tickets];
    tickets[index] = { ...tickets[index], [key]: value };
    setField('tickets', tickets);
  };

  const setLounge = (index: number, key: keyof Lounge, value: string) => {
    const lounges = [...form.loungeList];
    lounges[index] = { ...lounges[index], [key]: value };
    setField('loungeList', lounges);
  };

  const setDiscount = (index: number, key: keyof DiscountCode, value: string) => {
    const codes = [...form.discountCodes];
    codes[index] = { ...codes[index], [key]: value };
    setField('discountCodes', codes);
  };

  async function save() {
    if (!form.title || !form.date || form.tickets.length === 0 || !form.tickets[0].price) {
      setError('Bitte Event-Name, Datum und mindestens einen Ticketpreis ausfüllen.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const veranstalterId = getVeranstalterId();
      if (!veranstalterId) {
        window.location.href = '/veranstalter/login';
        return;
      }

      const res = await fetch('/api/veranstalter/events', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ veranstalterId, event: form }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Event konnte nicht gespeichert werden.');
        setSaving(false);
        return;
      }

      router.push('/veranstalter/events');
    } catch {
      setError('Event konnte nicht gespeichert werden.');
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: '#666' }}>Laden...</p>;

  return (
    <div style={{ maxWidth: '820px' }}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '14px' }}>
          <a href="/veranstalter/events" style={{ color: '#6b7280', textDecoration: 'none' }}>Meine Events</a> / {form.id ? 'Bearbeiten' : 'Neu'}
        </p>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#111' }}>
          {form.id ? 'Event bearbeiten' : 'Neues Event'}
        </h1>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ color: '#dc2626', margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', color: '#111' }}>Allgemein</h2>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div><label style={labelStyle}>Event-Name *</label><input style={inputStyle} value={form.title} onChange={e => setField('title', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Stadt</label><input style={inputStyle} value={form.city} onChange={e => setField('city', e.target.value)} /></div>
              <div><label style={labelStyle}>Location</label><input style={inputStyle} value={form.location} onChange={e => setField('location', e.target.value)} /></div>
            </div>
            <div><label style={labelStyle}>Adresse</label><input style={inputStyle} value={form.address} onChange={e => setField('address', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Datum *</label><input type="date" style={inputStyle} value={form.date} onChange={e => setField('date', e.target.value)} /></div>
              <div><label style={labelStyle}>Uhrzeit</label><input style={inputStyle} placeholder="22:00" value={form.time} onChange={e => setField('time', e.target.value.replace(/[^0-9:]/g, '').slice(0, 5))} /></div>
            </div>
            <div>
              <label style={labelStyle}>Online-Verkauf bis</label>
              <input type="datetime-local" style={inputStyle} value={form.onlineSaleEndsAt} onChange={e => setField('onlineSaleEndsAt', e.target.value)} />
            </div>
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', color: '#111' }}>Bild</h2>
          <label style={{ display: 'flex', justifyContent: 'center', padding: '18px', border: '2px dashed #d1d5db', borderRadius: '10px', cursor: 'pointer', marginBottom: '12px' }}>
            <span style={{ color: '#6b7280' }}>{uploading ? 'Wird hochgeladen...' : 'Bild auswählen'}</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const url = await uploadImage(file);
                setField('imageUrl', url);
              } catch (err: any) {
                setError(err?.message || 'Bild konnte nicht hochgeladen werden.');
              } finally {
                setUploading(false);
              }
            }} />
          </label>
          <input style={inputStyle} placeholder="oder Bild-URL" value={form.imageUrl} onChange={e => setField('imageUrl', e.target.value)} />
          {form.imageUrl && <img src={form.imageUrl} alt="" style={{ marginTop: '12px', width: '100%', height: '170px', objectFit: 'cover', borderRadius: '10px' }} />}
        </section>

        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', color: '#111' }}>Beschreibung</h2>
          <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={form.description} onChange={e => setField('description', e.target.value)} />
        </section>

        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#111' }}>Ticketarten</h2>
            <button onClick={() => setField('tickets', [...form.tickets, { name: '', price: '', quantity: '' }])} style={{ border: 'none', background: '#111827', color: '#fff', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>+ Ticket</button>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {form.tickets.map((ticket, index) => (
              <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px', color: '#374151' }}>Ticket {index + 1}</strong>
                  <button onClick={() => setField('tickets', form.tickets.filter((_, i) => i !== index))} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>Entfernen</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <input style={inputStyle} placeholder="Name" value={ticket.name} onChange={e => setTicket(index, 'name', e.target.value)} />
                  <input style={inputStyle} placeholder="Preis EUR" inputMode="decimal" value={ticket.price} onChange={e => setTicket(index, 'price', e.target.value)} />
                  <input style={inputStyle} placeholder="Menge" inputMode="numeric" value={ticket.quantity} onChange={e => setTicket(index, 'quantity', e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#111' }}>Lounges</h2>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', color: '#111', fontWeight: 600 }}>
              <input type="checkbox" checked={form.lounges} onChange={e => setField('lounges', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#111827' }} /> Lounges anbieten
            </label>
          </div>
          {form.lounges && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {form.loungeList.map((lounge, index) => (
                <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '13px', color: '#374151' }}>Lounge {index + 1}</strong>
                    <button onClick={() => setField('loungeList', form.loungeList.filter((_, i) => i !== index))} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>Entfernen</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <input style={inputStyle} placeholder="Name" value={lounge.name} onChange={e => setLounge(index, 'name', e.target.value)} />
                    <input style={inputStyle} placeholder="Personen" inputMode="numeric" value={lounge.persons} onChange={e => setLounge(index, 'persons', e.target.value)} />
                    <input style={inputStyle} placeholder="Preis EUR" inputMode="decimal" value={lounge.price} onChange={e => setLounge(index, 'price', e.target.value)} />
                  </div>
                </div>
              ))}
              <button onClick={() => setField('loungeList', [...form.loungeList, { name: '', persons: '', price: '' }])} style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}>+ Lounge hinzufügen</button>
            </div>
          )}
        </section>

        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#111' }}>Rabattcodes</h2>
            <button onClick={() => setField('discountCodes', [...form.discountCodes, { code: '', percent: '' }])} style={{ border: 'none', background: '#111827', color: '#fff', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>+ Code</button>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {form.discountCodes.length === 0 && <p style={{ color: '#6b7280', margin: 0 }}>Keine Rabattcodes.</p>}
            {form.discountCodes.map((code, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                <input style={inputStyle} placeholder="CODE" value={code.code} onChange={e => setDiscount(index, 'code', e.target.value.toUpperCase())} />
                <input style={inputStyle} placeholder="Rabatt %" inputMode="numeric" value={code.percent} onChange={e => setDiscount(index, 'percent', e.target.value)} />
                <button onClick={() => setField('discountCodes', form.discountCodes.filter((_, i) => i !== index))} style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}>X</button>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingBottom: '32px' }}>
          <button onClick={() => router.push('/veranstalter/events')} style={{ padding: '12px 18px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Abbrechen</button>
          <button onClick={save} disabled={saving} style={{ padding: '12px 20px', border: 'none', borderRadius: '8px', background: saving ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
