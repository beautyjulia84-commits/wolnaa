export type ConfiguredTicket = {
  name?: string;
  price?: string | number;
  quantity?: string | number;
};

export type SoldTicketRow = {
  ticket_name?: string | null;
  status?: string | null;
};

export function normalizeTicketName(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function getTicketPhase(tickets: ConfiguredTicket[], soldRows: SoldTicketRow[]) {
  const soldByName = new Map<string, number>();
  for (const row of soldRows) {
    if (row.status === 'cancelled') continue;
    const key = normalizeTicketName(row.ticket_name);
    soldByName.set(key, (soldByName.get(key) || 0) + 1);
  }

  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const sold = soldByName.get(normalizeTicketName(ticket.name)) || 0;
    const limit = Number(ticket.quantity || 0);

    // Eine leere Menge kennzeichnet die unbegrenzte, normalerweise letzte Phase.
    if (!Number.isFinite(limit) || limit <= 0) {
      return { activeIndex: index, activeTicket: ticket, sold, remaining: null as number | null };
    }
    if (sold < limit) {
      return { activeIndex: index, activeTicket: ticket, sold, remaining: Math.max(0, limit - sold) };
    }
  }

  return { activeIndex: -1, activeTicket: null, sold: 0, remaining: 0 };
}
