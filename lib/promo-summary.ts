export type PromoOrder = { id: string; code?: string | null; tickets: number | null; refund: string };
export function summarizePromos(orders: PromoOrder[]) {
  const groups = new Map<string, { code: string; tickets: number; orders: number; refunded: number; partial: number; unknown: number }>();
  // Deduplicate pages before aggregation. A combined discount belongs to each code.
  for (const order of new Map(orders.map(order => [order.id, order])).values()) {
    const codes = [...new Set((order.code || '').split('+').map(code => code.trim().toUpperCase()).filter(Boolean))];
    for (const code of codes.length ? codes : ['Ohne Promocode']) {
      const group = groups.get(code) || { code, tickets: 0, orders: 0, refunded: 0, partial: 0, unknown: 0 };
      group.orders++;
      if (order.refund === 'full') group.refunded += order.tickets || 0;
      else group.tickets += order.tickets || 0;
      if (order.refund === 'partial') group.partial++;
      if (order.tickets === null || order.refund === 'unknown') group.unknown++;
      groups.set(code, group);
    }
  }
  return [...groups.values()].sort((a,b) => b.tickets - a.tickets || a.code.localeCompare(b.code));
}
