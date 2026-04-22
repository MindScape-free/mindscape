import type { Metadata } from 'next';
import './globals.css';

export const runtime = 'nodejs';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { Icons } from '@/components/icons';
import localFont from 'next/font/local';
import { AIConfigProvider } from '@/contexts/ai-config-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ActivityProvider } from '@/contexts/activity-context';
import { XPProvider } from '@/contexts/xp-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PollinationsAuthHandler } from '@/components/pollinations-auth-handler';
import { AuthProvider } from '@/lib/auth-context';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { ChangelogDialog } from '@/components/changelog-dialog';

const spaceGrotesk = localFont({
  src: [
    {
      path: '../../public/fonts/space-grotesk-v22-latin-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/space-grotesk-v22-latin-500.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/space-grotesk-v22-latin-700.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const orbitron = localFont({
  src: [
    {
      path: '../../public/fonts/orbitron-v35-latin-700.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/orbitron-v35-latin-900.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-orbitron',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MindScape',
  description: 'Generate beautiful, multi-layered mind maps for any topic.',
};

function BackgroundGlow() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_15%)]" />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('dark', spaceGrotesk.variable, orbitron.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/MindScape-Logo.png" sizes="any" />
      </head>
      <body className={cn('min-h-screen w-full overflow-x-hidden', 'bg-[#0D0D0D] text-[#EAEAEA]')} suppressHydrationWarning>
          <AuthProvider>
            <AIConfigProvider>
              <PollinationsAuthHandler />
              <OnboardingWizard />
              <NotificationProvider>
                <ActivityProvider>
                  <XPProvider>
                  <TooltipProvider delayDuration={400}>
                    <BackgroundGlow />
                    <Navbar />
                    <main className="h-full">{children}</main>
                    <Toaster />
                    <ChangelogDialog />
                  </TooltipProvider>
                  </XPProvider>
                </ActivityProvider>
              </NotificationProvider>
</AIConfigProvider>
            </AuthProvider>
      </body>
    </html>
  );
}
