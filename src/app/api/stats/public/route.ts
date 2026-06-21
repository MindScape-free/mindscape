import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [mapsResult, usersResult, nodesResult, studyResult] = await Promise.allSettled([
      supabase.from('mindmaps').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('mindmaps').select('node_count'),
      supabase.from('user_profiles').select('study_time_minutes'),
    ]);

    const mapsCount = mapsResult.status === 'fulfilled' ? (mapsResult.value.count ?? 0) : 0;
    const usersCount = usersResult.status === 'fulfilled' ? (usersResult.value.count ?? 0) : 0;
    const nodesCount = nodesResult.status === 'fulfilled'
      ? (nodesResult.value.data ?? []).reduce((sum: number, row: any) => sum + (row.node_count || 0), 0)
      : 0;
    const totalMinutes = studyResult.status === 'fulfilled'
      ? (studyResult.value.data ?? []).reduce((sum: number, row: any) => sum + (row.study_time_minutes || 0), 0)
      : 0;
    const studyHours = Math.round(totalMinutes / 60);

    return NextResponse.json({
      mapsCount,
      usersCount,
      nodesCount,
      studyHours,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[StatsPublic] Error:', error);
    return NextResponse.json(
      { mapsCount: 0, usersCount: 0, nodesCount: 0, studyHours: 0 },
      { status: 500 }
    );
  }
}
