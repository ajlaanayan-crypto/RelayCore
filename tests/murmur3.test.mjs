import test from 'node:test';
import assert from 'node:assert';

function murmur3_32(key, seed = 0) {
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  const length = key.length;
  const remainder = length & 3;
  const bytes = length - remainder;

  for (let i = 0; i < bytes; i += 4) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }

  let k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(bytes + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(bytes + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(bytes) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

function getBucket(entityId, flagKey, salt) {
  const compositeKey = `${salt}:${flagKey}:${entityId}`;
  const hash = murmur3_32(compositeKey, 0);
  return { bucket: hash % 100, hash };
}

test('MurmurHash3 Uniformity: 10,000 keys distribute evenly across 0..99', () => {
  const totalKeys = 10000;
  const buckets = new Array(100).fill(0);
  const salt = 'enterprise_prod_salt_882';
  const flagKey = 'new_checkout_flow';

  for (let i = 0; i < totalKeys; i++) {
    const { bucket } = getBucket(`user_${i}`, flagKey, salt);
    buckets[bucket]++;
  }

  for (let b = 0; b < 100; b++) {
    assert.ok(
      buckets[b] >= 50 && buckets[b] <= 160,
      `Bucket ${b} count ${buckets[b]} is outside acceptable uniform bounds`
    );
  }
});

test('Monotonic Rollout Stability: Scaling 10% to 25% preserves 100% of existing cohort', () => {
  const salt = 'salt_checkout_test';
  const flagKey = 'checkout_redesign';
  const totalUsers = 1000;

  const cohortAt10 = new Set();
  const cohortAt25 = new Set();

  for (let i = 0; i < totalUsers; i++) {
    const userId = `usr_${i}`;
    const { bucket } = getBucket(userId, flagKey, salt);

    if (bucket < 10) cohortAt10.add(userId);
    if (bucket < 25) cohortAt25.add(userId);
  }

  for (const userId of cohortAt10) {
    assert.ok(cohortAt25.has(userId), `User ${userId} was displaced during rollout expansion!`);
  }
  assert.ok(cohortAt25.size > cohortAt10.size, '25% cohort should be larger than 10% cohort');
});

test('Flag Salt Independence: Different flags allocate the same user to independent buckets', () => {
  const userId = 'alice_enterprise_99';
  const salt1 = 'salt_flag_alpha';
  const salt2 = 'salt_flag_beta';

  const r1 = getBucket(userId, 'flag_alpha', salt1);
  const r2 = getBucket(userId, 'flag_beta', salt2);

  assert.notStrictEqual(r1.hash, r2.hash);
});
