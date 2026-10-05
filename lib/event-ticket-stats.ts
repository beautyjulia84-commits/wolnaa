import type { SupabaseClient } from '@supabase/supabase-js';

type Ticket = { id: string; ticket_id?: string | null; status?: string | null; amount?: number | string | null; quantity?: number | null };
export function calculateTicketStats(rows: Ticket[]) {
  const sold = [...new Map(rows.map(row => [row.id, row])).values()].filter(row =>
    (row.status === 'paid' || row.status === 'checked_in') && !row.ticket_id?.startsWith('WOLNAA-GIVEAWAY-')
  );
  return {
    tickets_sold: sold.reduce((sum, row) => sum + (Number.isSafeInteger(row.quantity) && Number(row.quantity) > 0 ? Number(row.quantity) : 1), 0),
    total_revenue: sold.reduce((sum, row) => sum + Math.round(Number(row.amount || 0) * 100), 0),
  };
}

export async function withTicketStats<T extends {id:string;title:string}>(db: SupabaseClient, events:T[]) {
  return Promise.all(events.map(async event => {
    // Only assign title-only legacy tickets when the title identifies exactly one event.
    const {data:matches,error:matchError} = await db.from('events').select('id').eq('title',event.title).limit(2);
    if(matchError) throw new Error('Ticketzuordnung konnte nicht geprüft werden.');
    const uniqueTitle = matches?.length === 1 && matches[0].id === event.id;
    const rows: Ticket[] = [];
    for (const legacy of uniqueTitle ? [false,true] : [false]) {
      for(let offset=0;;offset+=1000) {
        let query = db.from('tickets').select('id,ticket_id,status,amount,quantity').order('id').range(offset,offset+999);
        query = legacy ? query.is('event_id',null).eq('event_title',event.title) : query.eq('event_id',event.id);
        const {data,error} = await query;
        if(error) throw new Error('Ticketzahlen konnten nicht geladen werden.');
        rows.push(...(data || []));
        if(!data || data.length < 1000) break;
      }
    }
    return {...event,...calculateTicketStats(rows),ticket_stats_warning: uniqueTitle ? null : 'Ältere Tickets ohne Event-ID können bei mehrfach verwendeten Eventnamen nicht eindeutig zugeordnet werden.'};
  }));
}
