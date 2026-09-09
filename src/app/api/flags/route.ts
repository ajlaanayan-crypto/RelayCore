import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId, FlagConfig } from '@/types/flag';

export async function GET(request: NextRequest) {
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const env = (searchParams.get('env') as EnvironmentId) || 'production';

  const flags = store.getFlags(env);
  return NextResponse.json({
    environment: env,
    flags: Object.values(flags),
    count: Object.keys(flags).length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const env = (body.environment as EnvironmentId) || 'production';
    const flagData = body.flag as FlagConfig;
    const actor = body.actor || 'system_admin@nexusflag.io';
    const reason = body.reason || 'Flag configuration update';

    if (!flagData || !flagData.key) {
      return NextResponse.json({ error: 'Missing flag configuration or key' }, { status: 400 });
    }

    const saved = store.upsertFlag(env, flagData, actor, reason);
    return NextResponse.json({ flag: saved, status: 'success' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
