export type EnvironmentId = 'development' | 'staging' | 'production';

export type VariationValue = boolean | string | number | Record<string, unknown>;

export interface Variation {
  id: string;
  name: string;
  value: VariationValue;
  description?: string;
}

export type Operator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'IN'
  | 'NOT_IN'
  | 'SEMVER_GTE';

export interface Predicate {
  attribute: string;
  operator: Operator;
  values: string[];
}

export interface RuleGroup {
  id: string;
  name: string;
  combinator: 'AND' | 'OR';
  predicates: Predicate[];
  serveVariationId: string;
  rolloutPercentage?: number;
}

export interface RolloutDistribution {
  variationId: string;
  percentage: number;
}

export interface FlagConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  salt: string;
  version: number;
  isKillSwitched: boolean;
  defaultVariationId: string;
  variations: Variation[];
  targetLists: {
    variationId: string;
    entities: string[];
  }[];
  rules: RuleGroup[];
  rollout: RolloutDistribution[];
  updatedAt: string;
  updatedBy: string;
}

export type EnvironmentFlags = Record<string, FlagConfig>;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  flagKey: string;
  environment: EnvironmentId;
  action: 'KILL_SWITCH_ENGAGED' | 'KILL_SWITCH_DISENGAGED' | 'RULE_UPDATED' | 'ROLLOUT_MODIFIED' | 'ENV_PROMOTED' | 'FLAG_CREATED';
  reason: string;
  previousStateSnippet?: string;
  newStateSnippet?: string;
  diffSummary?: string;
}

export interface TelemetryMetric {
  flagKey: string;
  environment: EnvironmentId;
  variationId: string;
  evaluations: number;
  latencyMicrosecondsP50: number;
  latencyMicrosecondsP99: number;
  errorRate: number;
  timestamp: string;
}

export interface UserContext {
  userId: string;
  email?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  country?: string;
  appVersion?: string;
  ip?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface EvaluationResult {
  variationId: string;
  value: VariationValue;
  reason: 'KILL_SWITCH' | 'TARGET_LIST' | 'RULE_MATCH' | 'PERCENTAGE_ROLLOUT' | 'FALLTHROUGH' | 'POISON_PILL_FALLBACK';
  matchedRuleId?: string;
  bucket?: number;
  durationMicroseconds: number;
  cached: boolean;
}

export interface DeltaPatchEvent {
  type: 'FLAG_PATCH' | 'FLAG_KILL' | 'FLAG_DELETE' | 'HEARTBEAT';
  flagKey?: string;
  environment: EnvironmentId;
  version?: number;
  flag?: FlagConfig;
  patch?: Partial<FlagConfig>;
  timestamp: string;
}
