export type TableReservation = {
  id: string;
  name: string;
  zone: "standing" | "lounge" | "vip";
  tablePrice: number;
  minGuests: number;
  maxGuests: number;
  included: string;
  mapPosition: { left: string; top: string };
};

export const WERNAU_EVENT_ID = "8f885ec4-82dd-44ad-a974-ee974559d1cc";
export const TABLE_ENTRY_PRICE = 10;

export const WERNAU_TABLES: TableReservation[] = [
  { id: "standing-1", name: "Stehtisch 1", zone: "standing", tablePrice: 0, minGuests: 1, maxGuests: 6, included: "kostenloser Stehtisch", mapPosition: { left: "33%", top: "43%" } },
  { id: "standing-2", name: "Stehtisch 2", zone: "standing", tablePrice: 0, minGuests: 1, maxGuests: 6, included: "kostenloser Stehtisch", mapPosition: { left: "33%", top: "53%" } },
  { id: "standing-3", name: "Stehtisch 3", zone: "standing", tablePrice: 0, minGuests: 1, maxGuests: 6, included: "kostenloser Stehtisch", mapPosition: { left: "33%", top: "63%" } },
  { id: "lounge-1", name: "Lounge 1", zone: "lounge", tablePrice: 250, minGuests: 4, maxGuests: 8, included: "2 Vodka-Flaschen inklusive", mapPosition: { left: "14%", top: "29%" } },
  { id: "lounge-2", name: "Lounge 2", zone: "lounge", tablePrice: 250, minGuests: 4, maxGuests: 8, included: "2 Vodka-Flaschen inklusive", mapPosition: { left: "14%", top: "39%" } },
  { id: "lounge-3", name: "Lounge 3", zone: "lounge", tablePrice: 250, minGuests: 4, maxGuests: 8, included: "2 Vodka-Flaschen inklusive", mapPosition: { left: "14%", top: "49%" } },
  { id: "lounge-4", name: "Lounge 4", zone: "lounge", tablePrice: 250, minGuests: 4, maxGuests: 8, included: "2 Vodka-Flaschen inklusive", mapPosition: { left: "14%", top: "59%" } },
  { id: "vip-lounge", name: "VIP Lounge", zone: "vip", tablePrice: 500, minGuests: 10, maxGuests: 20, included: "4 Vodka-Flaschen inklusive", mapPosition: { left: "76%", top: "83%" } },
];

export function tablesForEvent(eventId?: string) {
  return eventId === WERNAU_EVENT_ID ? WERNAU_TABLES : [];
}

export function tableReservationItemName(table: Pick<TableReservation, "id" | "name">) {
  return `Tischreservierung: ${table.id} · ${table.name}`;
}

export function entryItemName(table: Pick<TableReservation, "name">) {
  return `Einlass: ${table.name}`;
}

export function getTableReservation(eventId: string | undefined, tableId: unknown) {
  if (typeof tableId !== "string") return null;
  return tablesForEvent(eventId).find((table) => table.id === tableId) ?? null;
}

export function tableReservationTotal(table: TableReservation, guests: number) {
  return table.tablePrice + guests * TABLE_ENTRY_PRICE;
}
