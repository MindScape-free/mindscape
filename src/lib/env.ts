/**
 * Environment Variable Validation
 *
 * Import this module early at server startup to fail fast on
 * misconfiguration.  The first call to `getEnv()` validates all
 * required variables and logs warnings for optional ones.
 *
 * Usage:
 *   import { getEnv } from '@/lib/env';
 *   const { supabaseUrl, pollinationsApiKey } = getEnv();
 */

export interface EnvVars {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  pollinationsApiKey?: string;
  youtubeApiKey?: string;
  appUrl: string;
  adminUserIds: string[];
  aiProviderTimeout: number;
}

let _cached: EnvVars | null = null;

function fmt(names: string[]): string {
  return names.map((n) => '  \u2022 ' + n).join('\n');
}

function isProduction(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

function warn(msg: string): void {
  if (typeof console !== 'undefined') console.warn('[Env] ' + msg);
}

function err(msg: string): void {
  if (typeof console !== 'undefined') console.error('[Env] ' + msg);
}

export function getEnv(): EnvVars {
  if (_cached) return _cached;

  const raw = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    pollinationsApiKey: process.env.POLLINATIONS_API_KEY,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    adminUserIds: process.env.NEXT_PUBLIC_ADMIN_USER_IDS,
    aiProviderTimeout: process.env.AI_PROVIDER_TIMEOUT,
  };

  const isProd = isProduction();

  // Required vars (always checked)
  const missing: string[] = [];
  if (!raw.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!raw.supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (missing.length > 0) {
    const msg = 'FATAL - Missing required env vars:\n' + fmt(missing)
      + '\n\nCreate a .env.local file with these values.';
    if (isProd) throw new Error(msg);
    warn(msg);
  }

  // Optional vars: only warn on the server (not expected in browser)
  if (isServer()) {
    const checks: Array<[string, string]> = [
      ['SUPABASE_SERVICE_ROLE_KEY', 'Admin ops fall back to anon key (limited).'],
      ['POLLINATIONS_API_KEY', 'Users must provide their own API key for AI.'],
      ['YOUTUBE_API_KEY', 'YouTube transcript extraction will not work.'],
      ['NEXT_PUBLIC_APP_URL', 'Using default http://localhost:3000.'],
      ['NEXT_PUBLIC_ADMIN_USER_IDS', 'Admin checks rely on DB is_admin column only.'],
    ];
    for (const [key, hint] of checks) {
      if (!process.env[key]) warn(key + ' is not set - ' + hint);
    }
  }

  _cached = {
    supabaseUrl: raw.supabaseUrl!,
    supabaseAnonKey: raw.supabaseAnonKey!,
    supabaseServiceRoleKey: raw.supabaseServiceRoleKey || undefined,
    pollinationsApiKey: raw.pollinationsApiKey || undefined,
    youtubeApiKey: raw.youtubeApiKey || undefined,
    appUrl: raw.appUrl || 'http://localhost:3000',
    adminUserIds: (raw.adminUserIds || '').split(',').map(s => s.trim()).filter(Boolean),
    aiProviderTimeout: parseInt(raw.aiProviderTimeout || '30000', 10),
  };

  return _cached;
}
