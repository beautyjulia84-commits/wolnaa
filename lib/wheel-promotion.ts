export const PROMOTION_EVENT_ID = 'd3a2c95d-893d-4ee4-8645-b28ec7f61063';
export function influencerPercent(eventId: string, code: unknown) {
  return eventId === PROMOTION_EVENT_ID && typeof code === 'string' && ['einfachwowa','janchik'].includes(code.trim().toLowerCase()) ? 10 : 0;
}
export function combinedWheelPercent(wheel: number, extra: number) { return Math.min(60, wheel + extra); }
