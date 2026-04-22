import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase admin client not initialized',
      }, { status: 500 });
    }

    // Test fetching users
    const { data: users, error: usersErr, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(10);
    
    // Test fetching stats
    const { data: stats, error: statsErr } = await supabase
      .from('admin_stats')
      .select('*')
      .eq('period', 'all-time')
      .single();
    
    // Test fetching logs
    const { data: logs, error: logsErr, count: logsCount } = await supabase
      .from('admin_activity_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      diagnostics: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing',
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      data: {
        usersCount: usersCount || 0,
        statsExists: !!stats,
        logsCount: logsCount || 0,
        errors: {
          users: usersErr?.message,
          stats: statsErr?.message,
          logs: logsErr?.message
        }
      },
      sampleUsers: (users || []).slice(0, 3),
      sampleLogs: (logs || []).slice(0, 3),
    });
  } catch (error: any) {
    console.error('[DebugAPI] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
