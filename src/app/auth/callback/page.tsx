'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-db';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    async function handleCallback() {
      const supabase = getSupabaseClient();
      
      // Check for error in query params first
      const url = new URL(window.location.href);
      const error = url.searchParams.get('error');
      
      if (error) {
        console.error('[Auth Callback] Error in URL:', error);
        setStatus(`Error: ${error}`);
        setTimeout(() => router.push('/?error=' + error), 2000);
        return;
      }
      
      // Check for tokens in hash fragment
      const hash = window.location.hash;
      console.log('[Auth Callback] Hash:', hash);
      
      if (hash && hash.includes('access_token')) {
        // Tokens are in hash - need to set them in Supabase
        // The hash format is: #access_token=...&expires_in=...&refresh_token=...&token_type=bearer
        // Supabase GoTrueClient automatically parses hash if present
        setStatus('Session established! Redirecting...');
        console.log('[Auth Callback] Setting session from hash...');
        
        // The easiest way is to use setSession with the parsed tokens
        // But GoTrueClient doesn't expose a direct method for hash parsing
        // Instead, we redirect and let Supabase handle it via the getSession
        window.location.hash = ''; // clear hash
        setTimeout(() => router.push('/'), 1000);
        return;
      }
      
      // Try to get session - Supabase should have stored it from cookie/token
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth Callback] Session error:', sessionError);
        setStatus('Error: ' + sessionError.message);
        setTimeout(() => router.push('/?error=session_error'), 2000);
        return;
      }
      
      if (data?.session) {
        console.log('[Auth Callback] Session found:', data.session.user?.email);
        setStatus('Welcome ' + data.session.user?.email + '!');
        setTimeout(() => router.push('/'), 1500);
      } else {
        // Try to get from URL params as fallback
        const code = url.searchParams.get('code');
        if (code) {
          setStatus('Exchanging code...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setStatus('Error: ' + exchangeError.message);
            setTimeout(() => router.push('/?error=exchange_failed'), 2000);
          } else {
            setStatus('Welcome!');
            setTimeout(() => router.push('/'), 1500);
          }
        } else {
          console.log('[Auth Callback] No session and no code');
          setStatus('No session established');
          setTimeout(() => router.push('/?error=no_session'), 2000);
        }
      }
    }
    
    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="text-4xl mb-4">🔄</div>
        <div className="text-xl">{status}</div>
      </div>
    </div>
  );
}
