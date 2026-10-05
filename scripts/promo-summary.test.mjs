import assert from 'node:assert/strict';
import {summarizePromos} from '../lib/promo-summary.ts';
import {promoReportRow} from '../lib/promo-report.ts';
const rows=[
  {id:'1',code:'WHEEL40+einfachwowa',tickets:3,refund:'none'},
  {id:'2',code:'EinfachWowa',tickets:2,refund:'full'},
  {id:'3',code:'CHRIS+chris',tickets:2,refund:'partial'},
  {id:'4',code:'',tickets:1,refund:'none'},
  {id:'5',code:'JANCHIK',tickets:null,refund:'unknown'},
];
const groups=summarizePromos([...rows, rows[0]]);
assert.deepEqual(groups.find(r=>r.code==='EINFACHWOWA'),{code:'EINFACHWOWA',tickets:3,orders:2,refunded:2,partial:0,unknown:0});
assert.equal(groups.find(r=>r.code==='CHRIS').tickets,2);
assert.equal(groups.find(r=>r.code==='CHRIS').partial,1);
assert.equal(groups.find(r=>r.code==='Ohne Promocode').tickets,1);
assert.equal(groups.find(r=>r.code==='JANCHIK').unknown,1);
const session={id:'cs_test',livemode:true,status:'complete',payment_status:'paid',metadata:{eventId:'owned',discountCode:'Chris',lineItems:'[{"qty":2}]'},payment_intent:{latest_charge:{refunded:false,amount_refunded:0}}};
assert.equal(promoReportRow(session,'owned').tickets,2);
assert.equal(promoReportRow(session,'other'),null);
assert.equal(promoReportRow({...session,payment_status:'unpaid'},'owned'),null);
assert.equal(promoReportRow({...session,livemode:false},'owned'),null);
console.log('Promo summaries: combinations, casing, pagination duplicates, refunds and event isolation passed');
