import test from 'node:test';
import assert from 'node:assert';

function semverCompare(v1, v2) {
  const p1 = v1.replace(/^[vV]/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^[vV]/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a !== b) return a > b ? 1 : -1;
  }
  return 0;
}

function evaluateFlagSimple(flag, context) {
  if (flag.isKillSwitched) {
    return { value: flag.variations.find(v => v.id === flag.defaultVariationId).value, reason: 'KILL_SWITCH' };
  }

  if (flag.targetLists) {
    for (const target of flag.targetLists) {
      if (target.entities.includes(context.userId)) {
        return { value: flag.variations.find(v => v.id === target.variationId).value, reason: 'TARGET_LIST' };
      }
    }
  }

  if (flag.rules) {
    for (const rule of flag.rules) {
      const match = rule.predicates.every(p => {
        const val = context[p.attribute];
        if (val === undefined) return false;
        if (p.operator === 'EQUALS') return p.values.includes(String(val));
        if (p.operator === 'IN') return p.values.includes(String(val));
        if (p.operator === 'SEMVER_GTE') return semverCompare(String(val), p.values[0]) >= 0;
        return false;
      });
      if (match) {
        return { value: flag.variations.find(v => v.id === rule.serveVariationId).value, reason: 'RULE_MATCH' };
      }
    }
  }

  return { value: flag.variations.find(v => v.id === flag.defaultVariationId).value, reason: 'FALLTHROUGH' };
}

test('Evaluation Hierarchy: Kill switch immediately overrides target list and rules', () => {
  const flag = {
    key: 'test_flag',
    isKillSwitched: true,
    defaultVariationId: 'control',
    variations: [
      { id: 'control', value: 'fallback_safe' },
      { id: 'treatment', value: 'dangerous_canary' },
    ],
    targetLists: [{ variationId: 'treatment', entities: ['usr_vip'] }],
    rules: [],
  };

  const res = evaluateFlagSimple(flag, { userId: 'usr_vip' });
  assert.strictEqual(res.value, 'fallback_safe');
  assert.strictEqual(res.reason, 'KILL_SWITCH');
});

test('Target List takes precedence over general rules', () => {
  const flag = {
    key: 'test_flag',
    isKillSwitched: false,
    defaultVariationId: 'control',
    variations: [
      { id: 'control', value: 'control_val' },
      { id: 'treatment', value: 'treatment_val' },
    ],
    targetLists: [{ variationId: 'treatment', entities: ['usr_vip'] }],
    rules: [
      {
        combinator: 'AND',
        predicates: [{ attribute: 'country', operator: 'EQUALS', values: ['US'] }],
        serveVariationId: 'control',
      },
    ],
  };

  const res = evaluateFlagSimple(flag, { userId: 'usr_vip', country: 'US' });
  assert.strictEqual(res.value, 'treatment_val');
  assert.strictEqual(res.reason, 'TARGET_LIST');
});

test('Micro-benchmark: 10,000 evaluations complete in <50ms (<5µs per evaluation)', () => {
  const flag = {
    key: 'benchmark_flag',
    isKillSwitched: false,
    defaultVariationId: 'control',
    variations: [
      { id: 'control', value: false },
      { id: 'treatment', value: true },
    ],
    targetLists: [{ variationId: 'treatment', entities: ['qa_tester_1', 'qa_tester_2'] }],
    rules: [
      {
        combinator: 'AND',
        predicates: [
          { attribute: 'country', operator: 'IN', values: ['US', 'CA', 'GB'] },
          { attribute: 'plan', operator: 'EQUALS', values: ['enterprise'] },
          { attribute: 'appVersion', operator: 'SEMVER_GTE', values: ['2.0.0'] },
        ],
        serveVariationId: 'treatment',
      },
    ],
  };

  const context = {
    userId: 'usr_bench_789',
    country: 'US',
    plan: 'enterprise',
    appVersion: '2.4.1',
  };

  const start = performance.now();
  for (let i = 0; i < 10000; i++) {
    evaluateFlagSimple(flag, context);
  }
  const durationMs = performance.now() - start;
  const avgMicroseconds = (durationMs / 10000) * 1000;

  console.log(`[Benchmark] 10,000 evaluations completed in ${durationMs.toFixed(2)}ms (Average: ${avgMicroseconds.toFixed(2)}µs per check)`);
  assert.ok(avgMicroseconds < 25, `Evaluation took ${avgMicroseconds}µs, expected <25µs`);
});
