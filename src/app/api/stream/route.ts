import { NextRequest } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId, DeltaPatchEvent } from '@/types/flag';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const env = (searchParams.get('env') as EnvironmentId) || 'production';

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const handshake = `: connected [env: ${env}, ts: ${new Date().toISOString()}]\n\n`;
      controller.enqueue(encoder.encode(handshake));

      const initialFlags = store.getFlags(env);
      for (const flag of Object.values(initialFlags)) {
        const bootstrapEvent: DeltaPatchEvent = {
          type: 'FLAG_PATCH',
          flagKey: flag.key,
          environment: env,
          version: flag.version,
          flag,
          timestamp: new Date().toISOString(),
        };
        const data = `data: ${JSON.stringify(bootstrapEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      const unsubscribe = store.onDelta(env, (event: DeltaPatchEvent) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
        }
      });

      const heartbeatTimer = setInterval(() => {
        try {
          const heartbeat: DeltaPatchEvent = {
            type: 'HEARTBEAT',
            environment: env,
            timestamp: new Date().toISOString(),
          };
          const ping = `data: ${JSON.stringify(heartbeat)}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}
