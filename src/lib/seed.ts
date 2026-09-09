import { EnvironmentFlags, AuditLogEntry } from '@/types/flag';

export const INITIAL_FLAGS_PROD: EnvironmentFlags = {
  new_checkout_flow: {
    id: 'flag_01',
    key: 'new_checkout_flow',
    name: 'New Checkout Flow (1-Click Stripe Express)',
    description: 'Replaces legacy 3-step form with unified Apple Pay/Stripe 1-click checkout modal',
    salt: 'salt_checkout_8947',
    version: 4,
    isKillSwitched: false,
    defaultVariationId: 'control',
    variations: [
      { id: 'control', name: 'Legacy 3-Step', value: false, description: 'Standard multi-page checkout' },
      { id: 'treatment', name: '1-Click Express', value: true, description: 'Unified instant express payment' },
    ],
    targetLists: [
      {
        variationId: 'treatment',
        entities: ['usr_qa_checkout', 'alice@company.com', 'vip_buyer_99'],
      },
    ],
    rules: [
      {
        id: 'rule_north_america_enterprise',
        name: 'Enterprise North America Fast Track',
        combinator: 'AND',
        predicates: [
          { attribute: 'country', operator: 'IN', values: ['US', 'CA'] },
          { attribute: 'plan', operator: 'EQUALS', values: ['enterprise'] },
        ],
        serveVariationId: 'treatment',
      },
      {
        id: 'rule_internal_staff',
        name: 'Internal Acme Employees',
        combinator: 'OR',
        predicates: [
          { attribute: 'email', operator: 'ENDS_WITH', values: ['@company.com', '@nexusflag.io'] },
        ],
        serveVariationId: 'treatment',
      },
    ],
    rollout: [
      { variationId: 'treatment', percentage: 25 },
      { variationId: 'control', percentage: 75 },
    ],
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    updatedBy: 'sarah.lin@nexusflag.io (Staff Eng)',
  },

  ai_copilot_assistant: {
    id: 'flag_02',
    key: 'ai_copilot_assistant',
    name: 'AI Copilot Assistant (Autonomous Mode)',
    description: 'Activates contextual multi-agent copilot in IDE and web portal with tool execution',
    salt: 'salt_copilot_1123',
    version: 7,
    isKillSwitched: false,
    defaultVariationId: 'off',
    variations: [
      { id: 'off', name: 'Disabled', value: false, description: 'Copilot icon hidden' },
      { id: 'v1_standard', name: 'Copilot v1 Standard', value: 'standard_v1', description: 'Single-turn prompt assistant' },
      { id: 'v2_autonomous', name: 'Copilot v2 Autonomous', value: 'autonomous_v2', description: 'Multi-agent tool-calling engine' },
    ],
    targetLists: [
      {
        variationId: 'v2_autonomous',
        entities: ['beta_tester_01', 'chief_architect@company.com'],
      },
    ],
    rules: [
      {
        id: 'rule_enterprise_tier',
        name: 'Enterprise Tier Only with Modern App Version',
        combinator: 'AND',
        predicates: [
          { attribute: 'plan', operator: 'EQUALS', values: ['enterprise'] },
          { attribute: 'app_version', operator: 'SEMVER_GTE', values: ['2.5.0'] },
        ],
        serveVariationId: 'v2_autonomous',
        rolloutPercentage: 50,
      },
    ],
    rollout: [
      { variationId: 'v2_autonomous', percentage: 30 },
      { variationId: 'v1_standard', percentage: 30 },
      { variationId: 'off', percentage: 40 },
    ],
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    updatedBy: 'alex.chen@nexusflag.io (Principal Architect)',
  },

  tier_3_rate_limiting: {
    id: 'flag_03',
    key: 'tier_3_rate_limiting',
    name: 'Tier 3 Global Rate Limiting Circuit Breaker',
    description: 'Enforces strict token bucket throttling (500 req/min) during DDoS or upstream database degradation',
    salt: 'salt_ratelimit_9901',
    version: 12,
    isKillSwitched: true,
    defaultVariationId: 'lenient',
    variations: [
      { id: 'lenient', name: 'Standard 10k/min', value: 10000, description: 'Baseline cloud capacity' },
      { id: 'strict', name: 'Strict 500/min Emergency Throttling', value: 500, description: 'Defensive emergency throttling' },
    ],
    targetLists: [],
    rules: [],
    rollout: [
      { variationId: 'strict', percentage: 100 },
    ],
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    updatedBy: 'security-ops@nexusflag.io (SecOps On-Call)',
  },

  global_dark_mode: {
    id: 'flag_04',
    key: 'global_dark_mode',
    name: 'Global OLED Dark Mode Theme',
    description: 'Next-gen high-contrast dark palette with glowing accents and zero OLED pixel bleed',
    salt: 'salt_darkmode_4421',
    version: 2,
    isKillSwitched: false,
    defaultVariationId: 'oled_black',
    variations: [
      { id: 'system', name: 'System Auto', value: 'auto', description: 'Follows OS preference' },
      { id: 'oled_black', name: 'OLED Pure Black', value: 'pure_black', description: 'High contrast #000000' },
      { id: 'nordic_frost', name: 'Nordic Frost Slate', value: 'nordic_slate', description: 'Muted slate #0f172a' },
    ],
    targetLists: [],
    rules: [],
    rollout: [
      { variationId: 'oled_black', percentage: 100 },
    ],
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    updatedBy: 'elena.rostova@nexusflag.io (Design Systems Lead)',
  },
};

export const INITIAL_FLAGS_STAGING: EnvironmentFlags = {
  ...JSON.parse(JSON.stringify(INITIAL_FLAGS_PROD)),
  new_checkout_flow: {
    ...JSON.parse(JSON.stringify(INITIAL_FLAGS_PROD.new_checkout_flow)),
    rollout: [
      { variationId: 'treatment', percentage: 100 },
    ],
    updatedBy: 'qa_lead@nexusflag.io',
  },
};

export const INITIAL_FLAGS_DEV: EnvironmentFlags = {
  ...JSON.parse(JSON.stringify(INITIAL_FLAGS_PROD)),
  new_checkout_flow: {
    ...JSON.parse(JSON.stringify(INITIAL_FLAGS_PROD.new_checkout_flow)),
    rollout: [
      { variationId: 'treatment', percentage: 100 },
    ],
  },
  ai_copilot_assistant: {
    ...JSON.parse(JSON.stringify(INITIAL_FLAGS_PROD.ai_copilot_assistant)),
    rollout: [
      { variationId: 'v2_autonomous', percentage: 100 },
    ],
  },
};

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_01',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    actor: 'security-ops@nexusflag.io (SecOps On-Call)',
    flagKey: 'tier_3_rate_limiting',
    environment: 'production',
    action: 'KILL_SWITCH_ENGAGED',
    reason: 'Emergency circuit breaker tripped: Upstream PostgreSQL replication lag exceeded 4500ms threshold.',
    previousStateSnippet: 'isKillSwitched: false, default: lenient',
    newStateSnippet: 'isKillSwitched: true (Fallback engaged across all edge nodes)',
    diffSummary: 'Kill-switch triggered; sub-millisecond SSE broadcast dispatches fallback to 2,400 connected client nodes.',
  },
  {
    id: 'audit_02',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    actor: 'sarah.lin@nexusflag.io (Staff Eng)',
    flagKey: 'new_checkout_flow',
    environment: 'production',
    action: 'ROLLOUT_MODIFIED',
    reason: 'Canary Phase 2 expansion from 10% to 25% following stable P99 latency and 0.01% error rate.',
    previousStateSnippet: 'Rollout: 10% Treatment, 90% Control',
    newStateSnippet: 'Rollout: 25% Treatment, 75% Control',
    diffSummary: 'MurmurHash3 monotonic expansion ensures 100% of previous cohort maintains Treatment experience.',
  },
  {
    id: 'audit_03',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    actor: 'alex.chen@nexusflag.io (Principal Architect)',
    flagKey: 'ai_copilot_assistant',
    environment: 'production',
    action: 'RULE_UPDATED',
    reason: 'Restricted autonomous Copilot v2 execution to enterprise accounts running SemVer >= 2.5.0.',
    previousStateSnippet: 'Predicates: plan == enterprise',
    newStateSnippet: 'Predicates: (plan == enterprise) AND (app_version >= 2.5.0)',
    diffSummary: 'Added SemVer predicate gate to prevent deprecated clients from triggering tool calls.',
  },
  {
    id: 'audit_04',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    actor: 'elena.rostova@nexusflag.io (Design Systems Lead)',
    flagKey: 'global_dark_mode',
    environment: 'production',
    action: 'FLAG_CREATED',
    reason: 'General availability rollout for OLED Pure Black color system across web and mobile surfaces.',
    previousStateSnippet: 'None (New entity)',
    newStateSnippet: 'Created flag with 3 theme variations and default OLED Black',
    diffSummary: 'New flag published with zero downtime.',
  },
];
