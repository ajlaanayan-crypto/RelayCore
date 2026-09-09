import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId } from '@/types/flag';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const store = getStore();
    const body = await request.json();
    const env = (body.environment as EnvironmentId) || 'production';
    const isKillSwitched = Boolean(body.isKillSwitched);
    const actor = body.actor || 'oncall_engineer@nexusflag.io';
    const reason = body.reason || (isKillSwitched ? 'EMERGENCY PANIC KILL SWITCH TRIGGERED' : 'Kill switch reset');

    const updated = store.toggleKillSwitch(env, id, isKillSwitched, actor, reason);
    if (!updated) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      flagKey: id,
      environment: env,
      isKillSwitched: updated.isKillSwitched,
      version: updated.version,
      updatedAt: updated.updatedAt,
      broadcastDispatched: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
