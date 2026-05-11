import { getSupabaseAdmin } from './src/lib/supabase-server';

async function diagnose() {
  console.log('🔍 [Diagnostic] Testing Admin Connection...');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS;

  console.log('--- Environment Check ---');
  console.log('URL:', url ? '✅ SET' : '❌ MISSING');
  console.log('Public Key:', pubKey ? '✅ SET' : '❌ MISSING');
  console.log('Service Role Key:', serviceKey ? '✅ SET' : '❌ MISSING');
  console.log('Admin IDs:', adminIds ? '✅ SET' : '❌ MISSING');

  if (!url || !serviceKey) {
    console.error('🛑 [CRITICAL] Admin credentials are missing. The API will fail.');
    return;
  }

  const supabase = getSupabaseAdmin();
  
  console.log('\n--- Database Connection ---');
  const { data: users, error: usersError } = await supabase.from('users').select('count');
  if (usersError) {
    console.error('❌ Failed to read users table:', usersError.message);
  } else {
    console.log('✅ Successfully connected to Users table.');
  }

  const { data: metrics, error: metricsError } = await supabase.from('platform_metrics_view').select('*').single();
  if (metricsError) {
    console.error('❌ Failed to read platform_metrics_view:', metricsError.message);
  } else {
    console.log('✅ Successfully read Platform Metrics View.');
    console.log('Metrics:', metrics);
  }
}

diagnose().catch(console.error);
