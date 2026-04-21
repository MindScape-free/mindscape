'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, User, Lock, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Icons } from '@/components/icons';
import { useAdminActivityLog } from '@/lib/admin-utils';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailPreFilled, setEmailPreFilled] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { logAdminActivity } = useAdminActivityLog();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) { setEmail(emailParam); setEmailPreFilled(true); }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username.trim()) return;
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Password must be at least 6 characters.' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, username.trim());
      if (error) { toast({ variant: 'destructive', title: 'Sign up failed', description: error.message }); return; }
      await logAdminActivity({ type: 'USER_CREATED', targetType: 'user', performedByEmail: email, details: `New user registered: ${username.trim()} (${email})` });
      toast({ title: 'Account created successfully!' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) { toast({ variant: 'destructive', title: 'Google sign in failed', description: error.message }); return; }
      toast({ title: 'Welcome to MindScape!' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google sign in failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl ring-1 ring-white/10">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-bold text-foreground mb-1">Create an account</h2>
            <p className="text-sm text-muted-foreground">Start your knowledge journey today</p>
          </div>

          <Button type="button" variant="outline" className="w-full h-10 bg-zinc-950/50 border-white/5 hover:bg-zinc-900/60 text-foreground" onClick={handleGoogleLogin} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-zinc-950 px-3 text-muted-foreground">or continue with email</span></div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your name" disabled={isLoading} required minLength={2} maxLength={50} className="h-9 pl-9 bg-zinc-950/50 border-white/5 focus:border-purple-400 text-foreground placeholder:text-muted-foreground text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-2">
              Email
              {emailPreFilled && <span className="inline-flex items-center text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full"><Check className="h-2.5 w-2.5 mr-0.5" />From sign in</span>}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={isLoading || emailPreFilled} required className="h-9 pl-9 bg-zinc-950/50 border-white/5 focus:border-purple-400 text-foreground placeholder:text-muted-foreground text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={isLoading} required minLength={6} className="h-9 pl-9 pr-9 bg-zinc-950/50 border-white/5 focus:border-purple-400 text-foreground placeholder:text-muted-foreground text-sm" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" disabled={isLoading} required minLength={6} className="h-9 pl-9 bg-zinc-950/50 border-white/5 focus:border-purple-400 text-foreground placeholder:text-muted-foreground text-sm" />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/30 group" disabled={isLoading || !username.trim() || !email || !password || !confirmPassword}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></>}
            Create Account
          </Button>

          <div className="text-center">
            <span className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/')} className="text-foreground hover:text-purple-400 transition-colors font-medium" disabled={isLoading}>Sign in</button>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>}>
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-[20px]" />
        <div className="relative w-full max-w-md"><SignupForm /></div>
      </div>
    </Suspense>
  );
}
