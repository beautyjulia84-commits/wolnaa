import assert from 'node:assert/strict';
import {splitAdminEvents} from '../lib/admin-event-scope';
const end = Date.parse('2026-11-07T04:00:00Z'); // 05:00 Berlin
const events = [
  {id:'past',date:'2026-10-01',time:'22:00',sold:8},
  {id:'night',date:'2026-11-06',time:'22:00',event_ends_at:'2026-11-07T04:00:00Z',sold:12},
  {id:'future',date:'2026-12-01',time:'22:00',sold:2},
];
assert.deepEqual(splitAdminEvents(events,0).current,[]);
assert.deepEqual(splitAdminEvents(events,end-1).current.map(e=>e.id),['night','future']);
const atEnd=splitAdminEvents(events,end);
assert.deepEqual(atEnd.current.map(e=>e.id),['future']);
assert.deepEqual(atEnd.archived.map(e=>e.id),['past','night']);
assert.equal(atEnd.current.reduce((sum,event)=>sum+event.sold,0),2);
assert.equal(atEnd.archived.reduce((sum,event)=>sum+event.sold,0),20);
assert.equal(events.length,3);
assert.equal(splitAdminEvents([{date:'2026-11-06',time:'22:00'}],end).archived.length,1);
assert.equal(splitAdminEvents([{date:'2026-10-24',time:'22:00'}],Date.parse('2026-10-25T04:00:00Z')).archived.length,1);
console.log('Admin event scope: end boundary, overnight, winter time, fallback and preserved totals passed.');
