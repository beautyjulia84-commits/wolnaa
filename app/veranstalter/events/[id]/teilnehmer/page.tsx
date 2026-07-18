'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

export default function TeilnehmerPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/veranstalter/events/${eventId}/tickets`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/veranstalter/login';
          return;
        }
        setError(data.error || 'Teilnehmer konnten nicht geladen werden.');
        setLoading(false);
        return;
      }

      setEvent(data.event);
      setTickets(data.tickets || []);
    } catch {
      setError('Teilnehmer konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eventId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter(t =>
      (t.customer_name || '').toLowerCase().includes(q) ||
      (t.customer_email || '').toLowerCase().includes(q) ||
      (t.ticket_id || '').toLowerCase().includes(q) ||
      (t.ticket_name || '').toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const checkedIn = tickets.filter(t => t.status === 'checked_in').length;
  const paid = tickets.filter(t => t.status !== 'cancelled').length;
  const revenue = tickets.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  async function toggleCheckIn(ticket: any) {
    const nextCheckedIn = ticket.status !== 'checked_in';

    const res = await fetch(`/api/veranstalter/events/${eventId}/tickets`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, checkedIn: nextCheckedIn }),
    });

    if (res.status === 401) {
      window.location.href = '/veranstalter/login';
      return;
    }
    if (res.ok) load();
  }

  function exportCsv() {
    const rows = [
      ['Name', 'E-Mail', 'Ticketart', 'Ticket-ID', 'Status', 'Betrag', 'Datum'],
      ...filtered.map(t => [
        t.customer_name || '',
        t.customer_email || '',
        t.ticket_name || '',
        t.ticket_id || '',
        t.status === 'checked_in' ? 'Eingecheckt' : t.status === 'cancelled' ? 'Storniert' : 'Bezahlt',
        String(t.amount || 0),
        t.created_at ? new Date(t.created_at).toLocaleString('de-DE') : '',
      ]),
    ];

    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.title || 'teilnehmer'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p style={{ color: '#666' }}>Laden...</p>;

  if (error) {
    return (
      <div>
        <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '14px' }}>
          <a href="/veranstalter/events" style={{ color: '#6b7280', textDecoration: 'none' }}>Meine Events</a>
        </p>
        <p style={{ color: '#dc2626' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '14px' }}>
          <a href="/veranstalter/events" style={{ color: '#6b7280', textDecoration: 'none' }}>Meine Events</a> / Teilnehmer
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700, color: '#111' }}>{event?.title}</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '15px' }}>
          {event?.date ? new Date(event.date).toLocaleDateString('de-DE') : ''}{event?.location ? ` · ${event.location}` : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '22px' }}>
        {[
          { label: 'Verkaufte Tickets', value: paid },
          { label: 'Eingecheckt', value: checkedIn },
          { label: 'Umsatz', value: `€${revenue.toFixed(2)}` },
        ].map(item => (
          <div key={item.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700, color: '#111' }}>{item.value}</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>{item.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Name, E-Mail, Ticket-ID oder Ticketart suchen..."
          style={{ flex: 1, padding: '11px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
        />
        <button onClick={exportCsv} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}>
          CSV
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#6b7280' }}>Noch keine Tickets für dieses Event.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Kunde', 'Ticket', 'Status', 'Betrag', 'Datum', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#111', fontSize: '14px' }}>{t.customer_name}</p>
                      <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '12px' }}>{t.customer_email}</p>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                      <p style={{ margin: 0 }}>{t.ticket_name || 'Ticket'}</p>
                      <p style={{ margin: '3px 0 0', color: '#9ca3af', fontSize: '11px' }}>{t.ticket_id}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 9px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: t.status === 'checked_in' ? '#dcfce7' : t.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                        color: t.status === 'checked_in' ? '#15803d' : t.status === 'cancelled' ? '#dc2626' : '#765725',
                      }}>
                        {t.status === 'checked_in' ? 'Eingecheckt' : t.status === 'cancelled' ? 'Storniert' : 'Bezahlt'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#111', fontWeight: 600, fontSize: '14px' }}>€{Number(t.amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '12px' }}>{t.created_at ? new Date(t.created_at).toLocaleString('de-DE') : '-'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {t.status !== 'cancelled' && (
                        <button onClick={() => toggleCheckIn(t)} style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontSize: '12px' }}>
                          {t.status === 'checked_in' ? 'Zurücksetzen' : 'Einchecken'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
