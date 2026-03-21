
'use client';

import { NeuralLoader } from '@/components/loading/neural-loader';

/**
 * A specialized loading state for the Canvas page.
 * Uses the MindScape Neural Engine loader for consistency.
 */
export default function CanvasLoading() {
    return <NeuralLoader />;
}
