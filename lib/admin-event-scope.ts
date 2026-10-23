import {eventTiming, type TimedEvent} from './event-timing';
/** Keep historical metrics available without mixing them into the live dashboard. */
export function splitAdminEvents<T extends TimedEvent>(events: T[], now: number) {
  if (!now) return {current: [] as T[], archived: [] as T[]};
  return {
    current: events.filter(event => !eventTiming(event, now).ended),
    archived: events.filter(event => eventTiming(event, now).ended),
  };
}
