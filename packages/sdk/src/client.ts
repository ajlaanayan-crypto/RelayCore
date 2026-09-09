import {
  EnvironmentId,
  FlagConfig,
  UserContext,
  EvaluationResult,
  VariationValue,
  DeltaPatchEvent,
  EnvironmentFlags,
} from '@/types/flag';
import { evaluateFlag } from './ast';
import { EncryptedSnapshotCache, SnapshotStorage } from './storage';
import { ReconnectBackoff } from './resilience';
import { TelemetryAggregator } from './telemetry';

export interface NexusFlagClientOptions {
  environment: EnvironmentId;
  relayStreamUrl?: string;
  initialFlags?: EnvironmentFlags;
  storage?: SnapshotStorage;
  enableTelemetry?: boolean;
  onUpdate?: (event: DeltaPatchEvent) => void;
}

export class NexusFlagClient {
  private environment: EnvironmentId;
  private flags: Map<string, FlagConfig> = new Map();
  private relayStreamUrl: string;
  private storage: SnapshotStorage;
  private backoff: ReconnectBackoff;
  private telemetry: TelemetryAggregator | null = null;
  private eventSource: EventSource | null = null;
  private isConnected: boolean = false;
  private onUpdateCallback?: (event: DeltaPatchEvent) => void;
  private updateListeners: Set<(flagKey: string) => void> = new Set();

  constructor(options: NexusFlagClientOptions) {
    this.environment = options.environment;
    this.relayStreamUrl = options.relayStreamUrl || `/api/stream?env=${this.environment}`;
    this.storage = options.storage || new EncryptedSnapshotCache();
    this.backoff = new ReconnectBackoff();
    this.onUpdateCallback = options.onUpdate;

    if (options.initialFlags) {
      this.loadFlags(options.initialFlags);
    }

    if (options.enableTelemetry !== false) {
      this.telemetry = new TelemetryAggregator({ environment: this.environment });
      this.telemetry.start();
    }
  }

  async initialize(): Promise<void> {
    const cached = await this.storage.load(this.environment);
    if (cached && Object.keys(cached).length > 0) {
      this.loadFlags(cached);
    }
    this.connectStream();
  }

  private loadFlags(flagsObj: EnvironmentFlags): void {
    for (const [key, flag] of Object.entries(flagsObj)) {
      this.flags.set(key, flag);
    }
  }

  variation<T extends VariationValue>(flagKey: string, context: UserContext, defaultValue: T): T {
    const detail = this.variationDetail(flagKey, context, defaultValue);
    return detail.value as T;
  }

  variationDetail<T extends VariationValue>(
    flagKey: string,
    context: UserContext,
    defaultValue: T
  ): EvaluationResult {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      return {
        variationId: 'default_fallback',
        value: defaultValue,
        reason: 'FALLTHROUGH',
        durationMicroseconds: 1,
        cached: false,
      };
    }

    const result = evaluateFlag(flag, context);

    if (this.telemetry) {
      this.telemetry.record(flagKey, result);
    }

    return result;
  }

  private connectStream(): void {
    if (typeof window === 'undefined' && typeof EventSource === 'undefined') {
      return;
    }

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      const url = `${this.relayStreamUrl}&t=${Date.now()}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.backoff.reset();
      };

      this.eventSource.onmessage = (e) => {
        try {
          const event: DeltaPatchEvent = JSON.parse(e.data);
          this.handleDeltaEvent(event);
        } catch (err) {
          console.error('Failed to parse stream event:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        const delay = this.backoff.nextDelayMs();
        setTimeout(() => this.connectStream(), delay);
      };
    } catch {
      const delay = this.backoff.nextDelayMs();
      setTimeout(() => this.connectStream(), delay);
    }
  }

  handleDeltaEvent(event: DeltaPatchEvent): void {
    if (event.type === 'HEARTBEAT') return;

    if (event.type === 'FLAG_PATCH' && event.flag) {
      this.flags.set(event.flag.key, event.flag);
      this.notifyListeners(event.flag.key);
    } else if (event.type === 'FLAG_KILL' && event.flagKey) {
      const existing = this.flags.get(event.flagKey);
      if (existing) {
        existing.isKillSwitched = true;
        this.flags.set(event.flagKey, existing);
        this.notifyListeners(event.flagKey);
      }
    } else if (event.type === 'FLAG_DELETE' && event.flagKey) {
      this.flags.delete(event.flagKey);
      this.notifyListeners(event.flagKey);
    }

    this.persistSnapshot();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(event);
    }
  }

  private async persistSnapshot(): Promise<void> {
    const dump: EnvironmentFlags = {};
    for (const [k, v] of this.flags.entries()) {
      dump[k] = v;
    }
    await this.storage.save(this.environment, dump);
  }

  subscribe(listener: (flagKey: string) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  private notifyListeners(flagKey: string): void {
    for (const listener of this.updateListeners) {
      listener(flagKey);
    }
  }

  getAllFlags(): FlagConfig[] {
    return Array.from(this.flags.values());
  }

  getFlag(key: string): FlagConfig | undefined {
    return this.flags.get(key);
  }

  isStreamConnected(): boolean {
    return this.isConnected;
  }

  destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.telemetry) {
      this.telemetry.stop();
    }
    this.updateListeners.clear();
  }
}
