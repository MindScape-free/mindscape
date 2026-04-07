
import type { Metadata } from 'next';
import './globals.css';

export const runtime = 'nodejs';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { FirebaseClientProvider } from '@/firebase';
import { Icons } from '@/components/icons';
import localFont from 'next/font/local';
import { AIConfigProvider } from '@/contexts/ai-config-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { ActivityProvider } from '@/contexts/activity-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PollinationsAuthHandler } from '@/components/pollinations-auth-handler';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { ChangelogDialog } from '@/components/changelog-dialog';
import { validateEnvironment } from '@/firebase/config';

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

/**
 * Metadata for the application, including the title and description.
 * @type {Metadata}
 */
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

/**
 * The root layout component for the entire application.
 * It sets up the HTML structure, includes global styles, fonts, and wraps the application
 * with necessary context providers like Firebase.
 * @param {Readonly<{ children: React.ReactNode }>} props - The props for the component.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout.
 * @returns {JSX.Element} The root layout of the application.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Validate environment variables on the server 
  // This will throw and trigger the error boundary if critical config is missing
  if (typeof window === 'undefined') {
    validateEnvironment();
  }

  return (
    <html lang="en" className={cn('dark', spaceGrotesk.variable, orbitron.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/MindScape-Logo.png" sizes="any" />
      </head>
      <body className={cn('min-h-screen w-full overflow-x-hidden', 'bg-[#0D0D0D] text-[#EAEAEA]')} suppressHydrationWarning>

        <FirebaseClientProvider>
          <AIConfigProvider>
            <PollinationsAuthHandler />
            <OnboardingWizard />
            <NotificationProvider>
              <ActivityProvider>
                <TooltipProvider delayDuration={400}>
                  <BackgroundGlow />
                  <Navbar />
                  <main className="h-full">{children}</main>
                  <Toaster />
                  <ChangelogDialog />
                </TooltipProvider>

              </ActivityProvider>
            </NotificationProvider>
          </AIConfigProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
