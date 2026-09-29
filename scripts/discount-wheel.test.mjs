import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawReward, readReward, signReward, WHEEL_COOKIE } from '../lib/discount-wheel.ts';
import { claimWheelSpin } from '../lib/wheel-counter.ts';

test('only every 70th spin wins 50%; all others win 30, 35 or 40', () => {
  for (let spin = 1; spin <= 7000; spin++) {
    const reward = drawReward(spin);
    assert.equal(reward.percent === 50, spin % 70 === 0);
    if (spin % 70) assert.ok([30, 35, 40].includes(reward.percent));
    assert.equal(reward.used, false);
    assert.ok(Math.abs(reward.expiresAt - Date.now() - 7200000) < 1000);
  }
  for (const invalid of [0, -1, NaN, 1.5]) assert.throws(() => drawReward(invalid));
});

test('new and previously issued rewards survive signed cookie validation', () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-secret';
  for (const percent of [5, 10, 15, 20, 25, 30, 35, 40, 50]) {
    const reward = { percent, expiresAt: Date.now() + 7200000, used: false };
    const request = new Request('https://example.test', { headers: { cookie: `${WHEEL_COOKIE}=${signReward(reward)}` } });
    assert.deepEqual(readReward(request), reward);
  }
});

function counterDatabase(initial) {
  let value = initial;
  return {
    from() {
      let update;
      const filters = {};
      const query = {
        async upsert() { value ??= '0'; return { error: null }; },
        select() { return query; },
        eq(key, expected) { filters[key] = expected; return query; },
        update(row) { update = row.value; return query; },
        async single() { return { data: { value }, error: null }; },
        async maybeSingle() {
          if (value !== filters.value) return { data: null, error: null };
          value = update;
          return { data: { value }, error: null };
        },
      };
      return query;
    },
  };
}

test('concurrent spins receive unique consecutive numbers and exactly two bonuses in 140 spins', async () => {
  const db = counterDatabase();
  const spins = [];
  for (let batch = 0; batch < 14; batch++) {
    spins.push(...await Promise.all(Array.from({ length: 10 }, () => claimWheelSpin(db))));
  }
  assert.deepEqual(spins.sort((a, b) => a - b), Array.from({ length: 140 }, (_, i) => i + 1));
  assert.equal(spins.filter(spin => drawReward(spin).percent === 50).length, 2);
  assert.equal(await claimWheelSpin(db), 141);
});

test('counter failures do not silently issue a random replacement reward', async () => {
  await assert.rejects(claimWheelSpin(counterDatabase('broken')));
  await assert.rejects(claimWheelSpin({ from: () => ({ upsert: async () => ({ error: { message: 'offline' } }) }) }));
});
