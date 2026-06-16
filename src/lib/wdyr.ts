/**
 * why-did-you-render — Dev-only React performance monitoring.
 *
 * Patches React to log components that re-render with the same props,
 * helping catch missed memoization opportunities.
 *
 * Import this file at the top of your client entry point:
 *   import '@/lib/wdyr';
 *
 * Only active in development. No-op in production.
 */

/// <reference types="@welldone-software/why-did-you-render" />

import React from 'react';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const whyDidYouRender = require('@welldone-software/why-did-you-render');

  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
    trackHooks: true,
    logOwnerReasons: true,
    collapseGroups: true,
    include: [/.*/],
    exclude: [
      /^Toaster/,
      /^Tooltip/,
      /^Toast/,
      /^Notification/,
      /^NodeJS/,
    ],
  });

  console.log(
    '%c🧐 WDYR active — watching for unnecessary re-renders',
    'color: #a855f7; font-weight: bold; font-size: 12px;'
  );
}
