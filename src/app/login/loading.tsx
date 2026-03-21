
'use client';

import { Loader2 } from 'lucide-react';

/**
 * A loading component specifically for the login page.
 * It is displayed as a fallback while the login page content is loading.
 * @returns {JSX.Element} A loading spinner component.
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-6.5rem)]">
      <Loader2 className="h-12 w-12 animate-spin" />
    </div>
  );
}
