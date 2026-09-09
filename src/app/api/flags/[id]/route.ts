import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId, FlagConfig } from '@/types/flag';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const env = (searchParams.get('env') as EnvironmentId) || 'production';

  const flag = store.getFlag(env, id);
  if (!flag) {
    return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
  }

  return NextResponse.json({ flag });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const store = getStore();
    const body = await request.json();
    const env = (body.environment as EnvironmentId) || 'production';
    const flagData = body.flag as FlagConfig;
    const actor = body.actor || 'admin@nexusflag.io';
    const reason = body.reason || 'Flag configuration update';

    flagData.key = id;
    const updated = store.upsertFlag(env, flagData, actor, reason);
    return NextResponse.json({ flag: updated, status: 'success' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const env = (searchParams.get('env') as EnvironmentId) || 'production';
  const actor = searchParams.get('actor') || 'admin@nexusflag.io';

  const deleted = store.deleteFlag(env, id, actor, 'Flag deletion via API');
  if (!deleted) {
    return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
  }

  return NextResponse.json({ status: 'deleted', key: id });
}
