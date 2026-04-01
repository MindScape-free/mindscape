'use client';

import Link from 'next/link';
import { useUser, useFirebase } from '@/firebase';
import { Button } from './ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, LogOut, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from './ui/skeleton';
import { motion } from 'framer-motion';
import { Icons } from './icons';
import { cn } from '@/lib/utils';
import { NotificationCenter } from './notification-center';
import { useAIConfig } from '@/contexts/ai-config-context';
import { LoginDialog } from './login-dialog';

export function Navbar() {
  const { user, isUserLoading } = useUser();
  const { firestore, isAdmin } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { resetConfig, pollenBalance, isBalanceLoading } = useAIConfig();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    const openLogin = () => setIsLoginOpen(true);
    window.addEventListener('mindscape:trigger-login', openLogin);
    return () => window.removeEventListener('mindscape:trigger-login', openLogin);
  }, []);

  // Listen to Firestore for real-time displayName updates
  useEffect(() => {
    if (!user || !firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileName(data.displayName || null);
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error('Navbar profile snapshot error: code=' + error.code);
      }
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Use Firestore name first, then Auth name, then fallback
  const displayName = profileName || user?.displayName || 'User';

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/library', label: 'Library' },
    { href: '/community', label: 'Community' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    resetConfig();
    router.push('/');
  };


  const renderUserAuth = () => {
    if (isUserLoading) {
      return <Skeleton className="h-10 w-10 rounded-full bg-secondary" />;
    }

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
            >
              <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarImage
                  src={user.photoURL ?? ''}
                  alt={displayName}
                />
                <AvatarFallback className="bg-secondary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glassmorphism" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => router.push('/admin')}>
                <Icons.shield className="mr-2 h-4 w-4 text-primary" />
                <span>Admin Dashboard</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button className="rounded-xl bg-zinc-800/80 px-4 py-2 text-sm text-zinc-200 ring-1 ring-white/10 transition hover:bg-zinc-800 hover:text-white" onClick={() => setIsLoginOpen(true)}>
        Login
      </Button>
    );
  };

  return (
    <header className="sticky top-0 z-[100] w-full px-4 py-3 pointer-events-none">
      <div className="mx-auto max-w-7xl w-full pointer-events-auto">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl ring-1 ring-white/5">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            {/* Left Section: Logo & Brand */}
            <div className="flex flex-1 items-center justify-start">
              <Link href="/" className="group flex items-center gap-3 transition-opacity">
                {/* Refined Glass Icon with Soft Glow */}
                <div className="relative">
                  {/* External Aura Glow - Softened */}
                  <div className="absolute inset-0 rounded-full bg-primary/0 blur-[20px] transition-all duration-500 group-hover:bg-primary/15" />

                  <div className="relative h-10 w-10 flex items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-500 group-hover:border-primary/50 overflow-hidden">
                    {/* Inner Content Tint */}
                    <div className="absolute inset-0 bg-primary/0 transition-all duration-500 group-hover:bg-primary/5" />

                    {/* Icon */}
                    <div className="relative z-10 p-1.5">
                      <Icons.logo className="h-6 w-6 transition-all duration-500 group-hover:drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                    </div>
                  </div>
                </div>

                {/* Brand Name */}
                <span className="text-xl font-black text-white tracking-widest font-orbitron">
                  Mind<span className="text-primary group-hover:text-accent transition-colors duration-500">Scape</span>
                </span>
              </Link>
            </div>

            {/* Center Section: Navigation */}
            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-900/40 p-1 ring-1 ring-white/5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-lg px-4 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:text-zinc-100 uppercase tracking-wider font-orbitron"
                >
                  {pathname === item.href && (
                    <motion.span
                      layoutId="navbar-highlight"
                      className="absolute inset-0 z-0 rounded-lg bg-white/5 backdrop-blur-md border border-white/10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Right Section: Auth & Profile */}
            <div className="flex flex-1 items-center justify-end gap-3">
              {user && (
                <Link
                  href="/profile?tab=lab"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all group min-w-[80px] justify-center"
                >
                  <span className="text-base group-hover:scale-110 transition-transform inline-block">🍄</span>
                  {isBalanceLoading ? (
                    <div className="h-4 w-12 bg-violet-500/20 animate-pulse rounded" />
                  ) : pollenBalance !== null ? (
                    <span className="text-xs font-black tracking-wider font-orbitron">
                      {pollenBalance.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-violet-400/50">--</span>
                  )}
                </Link>
              )}
              <NotificationCenter />
              {renderUserAuth()}

              {/* Mobile Hamburger Menu */}
              <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl bg-zinc-900/40 border border-white/10 text-white"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] border-white/10 bg-black/90 backdrop-blur-2xl p-0">
                    <SheetHeader className="p-6 border-b border-white/5">
                      <SheetTitle className="text-left">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-zinc-900 border border-white/10 shadow-2xl">
                            <Icons.logo className="h-5 w-5" />
                          </div>
                          <span className="text-lg font-black text-white tracking-widest font-orbitron">
                            Mind<span className="text-primary">Scape</span>
                          </span>
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col py-4">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center px-6 py-4 text-sm font-bold tracking-widest uppercase font-orbitron transition-all",
                            pathname === item.href
                              ? "bg-primary/10 text-primary border-r-2 border-primary"
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.2em]">
                        &copy; 2026 MindScape AI
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Subtle Bottom Glow Strip */}
          <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50" />
        </div>
      </div>

      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </header>
  );
}
