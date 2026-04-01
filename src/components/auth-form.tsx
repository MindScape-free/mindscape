
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password should be at least 6 characters',
  // Firebase SDK v9+ consolidates user-not-found + wrong-password into this:
  'auth/invalid-credential': 'Invalid email or password',
  'auth/popup-closed-by-user': 'Sign-in was cancelled',
  'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method',
  'auth/network-request-failed': 'Network error. Please check your connection',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
};

function getAuthErrorMessage(error: any): string {
  if (!error?.code) return 'An unexpected error occurred';
  return AUTH_ERRORS[error.code] || error.message || 'An unexpected error occurred';
}

function ErrorMessage({ error }: { error: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </motion.div>
  );
}

export function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  // Separate loading states so Google popup doesn't disable the email form
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const switchMode = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    setError(null);
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    // Confirm password check for sign-up
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsEmailLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (username.trim()) {
          await updateProfile(userCredential.user, { displayName: username.trim() });
        }
        toast({ title: 'Account created successfully!' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Welcome back!' });
      }
      onSuccess ? onSuccess() : router.back();
    } catch (err: any) {
      // Firebase SDK v9+ returns auth/invalid-credential for both wrong-password
      // and user-not-found. We handle both codes for backwards compatibility.
      if (!isSignUp && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        // Switch to sign-up mode pre-filled rather than navigating to /signup
        // (no /signup page is linked from the dialog flow)
        setError(getAuthErrorMessage(err));
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const tokenResponse = (result as any)._tokenResponse;
      const isNewUser = tokenResponse?.isNewUser;

      if (isNewUser || !result.user.displayName) {
        toast({ title: 'Welcome to MindScape!' });
        onSuccess ? onSuccess() : router.push('/profile?setup=true');
      } else {
        toast({ title: 'Welcome back!' });
        onSuccess ? onSuccess() : router.back();
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset email sent',
        description: 'Check your email for the password reset link.',
      });
      setIsResettingPassword(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getAuthErrorMessage(err),
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const anyLoading = isEmailLoading || isGoogleLoading;

  return (
    <div className="relative">
      <div className="relative rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl ring-1 ring-white/10">
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
                  disabled={isEmailLoading}
                  required
                  className="h-12 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/30"
                disabled={isEmailLoading}
              >
                {isEmailLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Send Reset Link
              </Button>

              <button
                type="button"
                onClick={() => setIsResettingPassword(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={isEmailLoading}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className={isSignUp ? 'space-y-3' : 'space-y-5'}>
              <div className={`text-center ${isSignUp ? 'mb-1' : 'mb-6'}`}>
                <h2 className={`font-bold text-foreground ${isSignUp ? 'text-2xl mb-1' : 'text-3xl mb-2'}`}>
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h2>
                <p className={`text-muted-foreground ${isSignUp ? 'text-sm' : 'text-base'}`}>
                  {isSignUp ? 'Start your knowledge journey today' : 'Sign in to access your mind maps'}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className={`w-full bg-zinc-950/50 border-white/5 hover:bg-zinc-900/60 hover:border-white/10 text-foreground ${isSignUp ? 'h-10 text-sm' : 'h-12'}`}
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isEmailLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.google className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </Button>

              <AnimatePresence>
                {error && <ErrorMessage error={error} />}
              </AnimatePresence>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-950 px-3 text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your name"
                      disabled={isEmailLoading}
                      className="h-9 pl-9 text-sm bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              <div className={isSignUp ? 'space-y-1' : 'space-y-2'}>
                <label className={`font-medium text-foreground ${isSignUp ? 'text-xs' : 'text-sm'}`}>Email</label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isSignUp ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isEmailLoading}
                    required
                    className={`pl-9 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground ${isSignUp ? 'h-9 text-sm' : 'h-12 pl-10'}`}
                  />
                </div>
              </div>

              <div className={isSignUp ? 'space-y-1' : 'space-y-2'}>
                <div className="flex justify-between items-center">
                  <label className={`font-medium text-foreground ${isSignUp ? 'text-xs' : 'text-sm'}`}>Password</label>
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
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isSignUp ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isEmailLoading}
                    required
                    minLength={6}
                    className={`pl-9 pr-9 bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground ${isSignUp ? 'h-9 text-sm' : 'h-12 pl-10 pr-10'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className={isSignUp ? 'h-4 w-4' : 'h-5 w-5'} /> : <Eye className={isSignUp ? 'h-4 w-4' : 'h-5 w-5'} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isEmailLoading}
                      required
                      minLength={6}
                      className="h-9 pl-9 text-sm bg-zinc-950/50 border-white/5 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className={`w-full bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-700 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/30 group ${isSignUp ? 'h-10' : 'h-12'}`}
                disabled={anyLoading}
              >
                {isEmailLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {isSignUp ? (
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode(false)}
                      className="text-foreground hover:text-purple-400 transition-colors font-medium"
                    >
                      Sign in
                    </button>
                  </span>
                </div>
              ) : (
                <div className="text-center pt-2">
                  <span className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode(true)}
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
