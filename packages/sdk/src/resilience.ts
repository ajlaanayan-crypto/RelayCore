export interface BackoffConfig {
  baseIntervalMs: number;
  maxIntervalMs: number;
  maxAttempts: number;
}

export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  baseIntervalMs: 500,
  maxIntervalMs: 30000,
  maxAttempts: 10,
};

export class ReconnectBackoff {
  private attempt: number = 0;
  private config: BackoffConfig;

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = { ...DEFAULT_BACKOFF_CONFIG, ...config };
  }

  nextDelayMs(): number {
    this.attempt++;
    const expDelay = Math.min(
      this.config.maxIntervalMs,
      this.config.baseIntervalMs * Math.pow(2, Math.min(this.attempt, 10))
    );
    const delayWithJitter = Math.floor(Math.random() * expDelay);
    return Math.max(100, delayWithJitter);
  }

  reset(): void {
    this.attempt = 0;
  }

  get currentAttempt(): number {
    return this.attempt;
  }
}
