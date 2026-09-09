import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { EnvironmentId } from '@/types/flag';

export async function GET(request: NextRequest) {
  const store = getStore();
  const searchParams = request.nextUrl.searchParams;
  const env = searchParams.get('env') as EnvironmentId | null;

  const logs = store.getAuditLogs(env || undefined);
  return NextResponse.json({
    environment: env || 'all',
    logs,
    total: logs.length,
  });
}
