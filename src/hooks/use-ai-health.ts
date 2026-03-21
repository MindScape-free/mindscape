
import { useState, useEffect } from 'react';
import { getAIHealthReportAction } from '@/app/actions';

/**
 * Custom hook to monitor the health status of AI providers.
 */
export function useAIHealth() {
    const [aiHealth, setAiHealth] = useState<{ name: string, status: string }[]>([]);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const report = await getAIHealthReportAction();
                setAiHealth(report);
            } catch (e) {
                console.warn("Failed to fetch AI health report", e);
            }
        };

        fetchHealth();
        const interval = setInterval(fetchHealth, 60000); // Poll every 60s
        return () => clearInterval(interval);
    }, []);

    return aiHealth;
}
