import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';

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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mindscape-free.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'MindScape - AI Mental Wellness & Knowledge Mapping',
    template: '%s | MindScape'
  },
  description: 'MindScape transforms unstructured ideas into clear, explorable knowledge through intelligent AI-powered visualization. Generate beautiful mind maps from any topic, PDF, or video.',
  keywords: ['AI Mind Map', 'Mind Mapping', 'Visual Learning', 'Knowledge Graph', 'Study Tool', 'Brainstorming AI', 'MindScape'],
  authors: [{ name: 'MindScape Team' }],
  creator: 'MindScape',
  publisher: 'MindScape',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'MindScape',
    title: 'MindScape - AI Mental Wellness & Knowledge Mapping',
    description: 'Transform your thoughts into structured knowledge with AI-powered mind maps.',
    images: [
      {
        url: '/MindScape-Logo.png',
        width: 1200,
        height: 630,
        alt: 'MindScape - AI Mind Mapping',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindScape - AI Mental Wellness & Knowledge Mapping',
    description: 'Transform your thoughts into structured knowledge with AI-powered mind maps.',
    images: ['/MindScape-Logo.png'],
    creator: '@mindscape',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
  verification: {
    google: '9496b274cc4aa95e',
  },
};

function BackgroundGlow() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_15%)]" />
    </>
  );
}

import { StructuredData } from '@/components/seo/structured-data';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('dark', spaceGrotesk.variable, orbitron.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/MindScape-Logo.png" sizes="any" />
        <StructuredData type="Organization" data={{}} />
        <StructuredData type="WebSite" data={{}} />
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
