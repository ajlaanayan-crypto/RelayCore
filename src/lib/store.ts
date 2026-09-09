import { EventEmitter } from 'events';
import {
  EnvironmentId,
  FlagConfig,
  EnvironmentFlags,
  AuditLogEntry,
  DeltaPatchEvent,
  TelemetryMetric,
} from '@/types/flag';
import {
  INITIAL_FLAGS_PROD,
  INITIAL_FLAGS_STAGING,
  INITIAL_FLAGS_DEV,
  INITIAL_AUDIT_LOGS,
} from './seed';

const globalForStore = globalThis as unknown as {
  __nexusflag_store__?: NexusFlagStore;
};

export class NexusFlagStore {
  private flagsByEnv: Record<EnvironmentId, EnvironmentFlags>;
  private auditLogs: AuditLogEntry[];
  private pubsub: EventEmitter;
  private telemetryStore: TelemetryMetric[];

  constructor() {
    this.flagsByEnv = {
      development: JSON.parse(JSON.stringify(INITIAL_FLAGS_DEV)),
      staging: JSON.parse(JSON.stringify(INITIAL_FLAGS_STAGING)),
      production: JSON.parse(JSON.stringify(INITIAL_FLAGS_PROD)),
    };
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.pubsub = new EventEmitter();
    this.pubsub.setMaxListeners(200);
    this.telemetryStore = this.seedTelemetry();
  }

  private seedTelemetry(): TelemetryMetric[] {
    const metrics: TelemetryMetric[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const ts = new Date(now - i * 60000).toISOString();
      metrics.push({
        flagKey: 'new_checkout_flow',
        environment: 'production',
        variationId: 'treatment',
        evaluations: Math.floor(250 + Math.random() * 50),
        latencyMicrosecondsP50: Math.floor(6 + Math.random() * 3),
        latencyMicrosecondsP99: Math.floor(18 + Math.random() * 6),
        errorRate: 0.0002 + Math.random() * 0.0003,
        timestamp: ts,
      });
      metrics.push({
        flagKey: 'new_checkout_flow',
        environment: 'production',
        variationId: 'control',
        evaluations: Math.floor(750 + Math.random() * 80),
        latencyMicrosecondsP50: Math.floor(7 + Math.random() * 4),
        latencyMicrosecondsP99: Math.floor(22 + Math.random() * 8),
        errorRate: 0.0012 + Math.random() * 0.0008,
        timestamp: ts,
      });
    }
    return metrics;
  }

  getFlags(env: EnvironmentId): EnvironmentFlags {
    return this.flagsByEnv[env] || {};
  }

  getFlag(env: EnvironmentId, key: string): FlagConfig | undefined {
    return this.flagsByEnv[env]?.[key];
  }

  upsertFlag(env: EnvironmentId, flag: FlagConfig, actor: string, reason: string): FlagConfig {
    if (!this.flagsByEnv[env]) {
      this.flagsByEnv[env] = {};
    }

    const prev = this.flagsByEnv[env][flag.key];
    const isNew = !prev;

    flag.version = (prev ? prev.version : 0) + 1;
    flag.updatedAt = new Date().toISOString();
    flag.updatedBy = actor;

    this.flagsByEnv[env][flag.key] = flag;

    this.addAuditLog({
      actor,
      flagKey: flag.key,
      environment: env,
      action: isNew ? 'FLAG_CREATED' : 'RULE_UPDATED',
      reason,
      previousStateSnippet: prev ? JSON.stringify({ version: prev.version, rollout: prev.rollout }) : 'None',
      newStateSnippet: JSON.stringify({ version: flag.version, rollout: flag.rollout }),
      diffSummary: isNew ? 'Created new flag entity' : `Updated rules & rollout (v${flag.version})`,
    });

    this.publishDelta({
      type: 'FLAG_PATCH',
      flagKey: flag.key,
      environment: env,
      version: flag.version,
      flag,
      timestamp: new Date().toISOString(),
    });

    return flag;
  }

  toggleKillSwitch(env: EnvironmentId, key: string, isKillSwitched: boolean, actor: string, reason: string): FlagConfig | null {
    const flag = this.flagsByEnv[env]?.[key];
    if (!flag) return null;

    const previousState = flag.isKillSwitched;
    flag.isKillSwitched = isKillSwitched;
    flag.version += 1;
    flag.updatedAt = new Date().toISOString();
    flag.updatedBy = actor;

    this.addAuditLog({
      actor,
      flagKey: flag.key,
      environment: env,
      action: isKillSwitched ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
      reason,
      previousStateSnippet: `KillSwitched: ${previousState}`,
      newStateSnippet: `KillSwitched: ${isKillSwitched}`,
      diffSummary: isKillSwitched
        ? 'Emergency circuit breaker engaged'
        : 'Kill switch disengaged',
    });

    this.publishDelta({
      type: isKillSwitched ? 'FLAG_KILL' : 'FLAG_PATCH',
      flagKey: flag.key,
      environment: env,
      version: flag.version,
      flag,
      timestamp: new Date().toISOString(),
    });

    return flag;
  }

  deleteFlag(env: EnvironmentId, key: string, actor: string, reason: string): boolean {
    if (!this.flagsByEnv[env]?.[key]) return false;

    delete this.flagsByEnv[env][key];

    this.addAuditLog({
      actor,
      flagKey: key,
      environment: env,
      action: 'RULE_UPDATED',
      reason,
      previousStateSnippet: `Key: ${key}`,
      newStateSnippet: 'DELETED',
      diffSummary: 'Flag removed from environment',
    });

    this.publishDelta({
      type: 'FLAG_DELETE',
      flagKey: key,
      environment: env,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  computeEnvironmentDiff(fromEnv: EnvironmentId, toEnv: EnvironmentId): {
    changes: Array<{
      flagKey: string;
      status: 'ADDED' | 'MODIFIED' | 'UNCHANGED' | 'REMOVED';
      fromFlag?: FlagConfig;
      toFlag?: FlagConfig;
      diffDescription: string;
    }>;
  } {
    const fromFlags = this.flagsByEnv[fromEnv] || {};
    const toFlags = this.flagsByEnv[toEnv] || {};
    const allKeys = Array.from(new Set([...Object.keys(fromFlags), ...Object.keys(toFlags)]));

    const changes = allKeys.map(key => {
      const from = fromFlags[key];
      const to = toFlags[key];

      if (!to && from) {
        return {
          flagKey: key,
          status: 'ADDED' as const,
          fromFlag: from,
          diffDescription: `Flag ${key} will be newly created in ${toEnv}`,
        };
      }
      if (!from && to) {
        return {
          flagKey: key,
          status: 'REMOVED' as const,
          toFlag: to,
          diffDescription: `Flag ${key} will be removed from ${toEnv}`,
        };
      }

      const isDiff = JSON.stringify({
        rules: from?.rules,
        rollout: from?.rollout,
        targetLists: from?.targetLists,
        isKillSwitched: from?.isKillSwitched,
      }) !== JSON.stringify({
        rules: to?.rules,
        rollout: to?.rollout,
        targetLists: to?.targetLists,
        isKillSwitched: to?.isKillSwitched,
      });

      return {
        flagKey: key,
        status: isDiff ? ('MODIFIED' as const) : ('UNCHANGED' as const),
        fromFlag: from,
        toFlag: to,
        diffDescription: isDiff
          ? `Rules or rollout differs between ${fromEnv} and ${toEnv}`
          : `Identical in both environments`,
      };
    });

    return { changes };
  }

  promoteEnvironment(
    fromEnv: EnvironmentId,
    toEnv: EnvironmentId,
    flagKeys: string[],
    actor: string,
    reason: string
  ): { promotedCount: number } {
    const fromFlags = this.flagsByEnv[fromEnv] || {};
    if (!this.flagsByEnv[toEnv]) this.flagsByEnv[toEnv] = {};

    let promotedCount = 0;
    for (const key of flagKeys) {
      if (fromFlags[key]) {
        const cloned: FlagConfig = JSON.parse(JSON.stringify(fromFlags[key]));
        cloned.version = (this.flagsByEnv[toEnv][key]?.version || 0) + 1;
        cloned.updatedAt = new Date().toISOString();
        cloned.updatedBy = `${actor} (Promoted from ${fromEnv})`;

        this.flagsByEnv[toEnv][key] = cloned;
        promotedCount++;

        this.addAuditLog({
          actor,
          flagKey: key,
          environment: toEnv,
          action: 'ENV_PROMOTED',
          reason: `Promoted from ${fromEnv} to ${toEnv}: ${reason}`,
          diffSummary: `Promoted rules & rollout from ${fromEnv}`,
        });

        this.publishDelta({
          type: 'FLAG_PATCH',
          flagKey: key,
          environment: toEnv,
          version: cloned.version,
          flag: cloned,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { promotedCount };
  }

  publishDelta(event: DeltaPatchEvent): void {
    this.pubsub.emit(`delta:${event.environment}`, event);
    this.pubsub.emit('delta:all', event);
  }

  onDelta(env: EnvironmentId, callback: (event: DeltaPatchEvent) => void): () => void {
    const channel = `delta:${env}`;
    this.pubsub.on(channel, callback);
    return () => this.pubsub.off(channel, callback);
  }

  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const log: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  getAuditLogs(env?: EnvironmentId): AuditLogEntry[] {
    if (!env) return this.auditLogs;
    return this.auditLogs.filter(log => log.environment === env);
  }

  ingestTelemetry(metric: TelemetryMetric): void {
    this.telemetryStore.push(metric);
    if (this.telemetryStore.length > 2000) {
      this.telemetryStore.shift();
    }
  }

  getTelemetry(flagKey: string, env: EnvironmentId): TelemetryMetric[] {
    return this.telemetryStore.filter(m => m.flagKey === flagKey && m.environment === env);
  }
}

export function getStore(): NexusFlagStore {
  if (!globalForStore.__nexusflag_store__) {
    globalForStore.__nexusflag_store__ = new NexusFlagStore();
  }
  return globalForStore.__nexusflag_store__;
}
