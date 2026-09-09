import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId, TelemetryMetric } from '@/types/flag';

export async function GET(request: NextRequest) {
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const flagKey = searchParams.get('flagKey') || 'new_checkout_flow';
  const env = (searchParams.get('env') as EnvironmentId) || 'production';

  const metrics = store.getTelemetry(flagKey, env);
  return NextResponse.json({
    flagKey,
    environment: env,
    metrics,
  });
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const events = body.events || [];

    for (const evt of events) {
      const metric: TelemetryMetric = {
        flagKey: evt.flagKey,
        environment: evt.environment || 'production',
        variationId: evt.variationId,
        evaluations: 1,
        latencyMicrosecondsP50: evt.durationMicroseconds || 5,
        latencyMicrosecondsP99: Math.floor((evt.durationMicroseconds || 5) * 2.5),
        errorRate: 0.0001,
        timestamp: evt.timestamp || new Date().toISOString(),
      };
      store.ingestTelemetry(metric);
    }

    return NextResponse.json({ status: 'ingested', count: events.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
