import assert from 'node:assert/strict';
import {calculateTicketStats,withTicketStats} from '../lib/event-ticket-stats.ts';
const paid={id:'a',ticket_id:'WOLNAA-A',status:'paid',amount:39,quantity:1};
assert.deepEqual(calculateTicketStats([paid,paid,{...paid,id:'b',amount:0,status:'checked_in'},{...paid,id:'c',status:'cancelled'},{...paid,id:'d',ticket_id:'WOLNAA-GIVEAWAY-1'},{...paid,id:'e',status:'pending'}]),{tickets_sold:2,total_revenue:3900});
assert.deepEqual(calculateTicketStats([{...paid,quantity:3}]),{tickets_sold:3,total_revenue:3900});
const event={id:'event-1',title:'Indoor Festival',tickets_sold:0};
let duplicateTitle=false,fail=false;const pages=[];
const db={from(table){let legacy=false,start=0,end=999;return {
 select(){return this},eq(){return this},is(){legacy=true;return this},order(){return this},range(a,b){start=a;end=b;return this},limit(){return this},
 then(resolve){if(table==='events')return Promise.resolve(resolve({data:duplicateTitle?[{id:event.id},{id:'other'}]:[{id:event.id}]}));pages.push([legacy,start]);const rows=legacy?[{...paid,id:'legacy'}]:Array.from({length:1001},(_,i)=>({...paid,id:'linked-'+i,amount:0}));return Promise.resolve(resolve(fail?{error:new Error('offline')}:{data:rows.slice(start,end+1)}));}
}}};
let result=await withTicketStats(db,[event]);
assert.equal(result[0].tickets_sold,1002);assert.equal(result[0].total_revenue,3900);assert.ok(pages.some(([legacy,start])=>!legacy&&start===1000));
duplicateTitle=true;result=await withTicketStats(db,[event]);assert.equal(result[0].tickets_sold,1001);assert.ok(result[0].ticket_stats_warning);
fail=true;await assert.rejects(()=>withTicketStats(db,[event]));
console.log('Ticket statistics: stale counter, legacy tickets, duplicates, guests, cancellations, pagination and error handling passed');
