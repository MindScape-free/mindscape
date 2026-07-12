'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/lib/auth-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useAuth();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!isUserLoading && user) {
      window.location.replace(redirect);
    }
  }, [user, isUserLoading, redirect]);

  const handleSuccess = () => {
    router.push(redirect);
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-48 bg-zinc-950 rounded-2xl border border-white/10 p-5 shadow-2xl">
        <span className="text-sm text-zinc-400">Loading auth state...</span>
      </div>
    );
  }

  return (
    <AuthForm onSuccess={handleSuccess} />
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-[20px]" />
      <div className="relative w-full max-w-md">
        <Suspense fallback={
          <div className="flex items-center justify-center h-48 bg-zinc-950 rounded-2xl border border-white/10 p-5 shadow-2xl">
            <span className="text-sm text-zinc-400">Loading...</span>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
