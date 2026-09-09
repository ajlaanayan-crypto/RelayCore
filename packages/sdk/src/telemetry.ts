import { EnvironmentId, EvaluationResult } from '@/types/flag';

export interface EvaluationEvent {
  flagKey: string;
  environment: EnvironmentId;
  variationId: string;
  durationMicroseconds: number;
  reason: string;
  timestamp: string;
}

export class TelemetryAggregator {
  private queue: EvaluationEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private endpoint: string;
  private environment: EnvironmentId;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor(options: {
    endpoint?: string;
    environment: EnvironmentId;
    batchSize?: number;
    flushIntervalMs?: number;
  }) {
    this.endpoint = options.endpoint || '/api/telemetry';
    this.environment = options.environment;
    this.batchSize = options.batchSize || 50;
    this.flushIntervalMs = options.flushIntervalMs || 5000;
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush().catch(() => {});
  }

  record(flagKey: string, result: EvaluationResult): void {
    this.queue.push({
      flagKey,
      environment: this.environment,
      variationId: result.variationId,
      durationMicroseconds: result.durationMicroseconds,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    });

    if (this.queue.length >= this.batchSize) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToFlush = [...this.queue];
    this.queue = [];

    try {
      if (typeof fetch !== 'undefined') {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: eventsToFlush }),
          keepalive: true,
        });
      }
    } catch {
      if (this.queue.length < 500) {
        this.queue.unshift(...eventsToFlush.slice(0, 100));
      }
    }
  }
}
