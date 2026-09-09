import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId } from '@/types/flag';

export async function GET(request: NextRequest) {
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const fromEnv = (searchParams.get('from') as EnvironmentId) || 'staging';
  const toEnv = (searchParams.get('to') as EnvironmentId) || 'production';

  const diff = store.computeEnvironmentDiff(fromEnv, toEnv);
  return NextResponse.json({
    fromEnvironment: fromEnv,
    toEnvironment: toEnv,
    ...diff,
  });
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore();
    const body = await request.json();
    const fromEnv = (body.from as EnvironmentId) || 'staging';
    const toEnv = (body.to as EnvironmentId) || 'production';
    const flagKeys = (body.flagKeys as string[]) || [];
    const actor = body.actor || 'release_manager@nexusflag.io';
    const reason = body.reason || `Promoted flags from ${fromEnv} to ${toEnv}`;

    if (flagKeys.length === 0) {
      return NextResponse.json({ error: 'No flags specified for promotion' }, { status: 400 });
    }

    const result = store.promoteEnvironment(fromEnv, toEnv, flagKeys, actor, reason);
    return NextResponse.json({
      status: 'promoted',
      from: fromEnv,
      to: toEnv,
      promotedCount: result.promotedCount,
      promotedFlags: flagKeys,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
