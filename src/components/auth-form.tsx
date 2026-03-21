
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Icons } from '@/components/icons';

/**
 * Enhanced authentication form matching homepage theme
 */
export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (username) {
          await updateProfile(userCredential.user, { displayName: username });
        }
        toast({ title: 'Account created successfully!' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Welcome back!' });
      }
      router.back();
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' && !isSignUp) {
        setIsSignUp(true);
        toast({ title: 'New user detected', description: 'Creating account...' });
        return;
      }
      toast({
        variant: 'destructive',
        title: isSignUp ? 'Sign up failed' : 'Sign in failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: 'Welcome back!' });
      router.back();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google sign in failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset email sent',
        description: 'Check your email for the password reset link.'
      });
      setIsResettingPassword(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Glassmorphism Card - Matching Homepage Style */}
      <div className="relative rounded-2xl border border-white/5 bg-zinc-900/40 p-6 shadow-[0_0_35px_rgba(168,85,247,0.2)] backdrop-blur-sm">

        <div className="relative">
          {isResettingPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Reset Password</h2>
                <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  required
                  className="h-12 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/30"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Send Reset Link
              </Button>

              <button
                type="button"
                onClick={() => setIsResettingPassword(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h2>
                <p className="text-base text-muted-foreground">
                  {isSignUp ? 'Start your knowledge journey today' : 'Sign in to access your mind maps'}
                </p>
              </div>

              {/* Google Sign In Button - Moved to top */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-zinc-950/50 border-white/5 hover:bg-zinc-900/60 hover:border-white/10 text-foreground mb-4"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Icons.google className="mr-2 h-5 w-5" />
                )}
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-900/40 px-3 text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your name"
                      disabled={isLoading}
                      className="h-12 pl-10 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    required
                    className="h-12 pl-10 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsResettingPassword(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    required
                    minLength={6}
                    className="h-12 pl-10 pr-10 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/30 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {isSignUp ? (
                <div className="text-center pt-4">
                  <span className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-foreground hover:text-purple-400 transition-colors font-medium"
                    >
                      Sign in
                    </button>
                  </span>
                </div>
              ) : (
                <div className="text-center pt-4">
                  <span className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-foreground hover:text-purple-400 transition-colors font-medium"
                    >
                      Sign up
                    </button>
                  </span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
