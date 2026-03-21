
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * Custom hook to manage URL search parameters and navigation logic for the mind map page.
 */
export function useMindMapRouter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const params = useMemo(() => ({
        topic: searchParams.get('topic'),
        topic1: searchParams.get('topic1'),
        topic2: searchParams.get('topic2'),
        sessionId: searchParams.get('sessionId'),
        mapId: searchParams.get('mapId'),
        sharedMapId: searchParams.get('sharedMapId'),
        publicMapId: searchParams.get('publicMapId'),
        studioId: searchParams.get('studioId'),
        lang: searchParams.get('lang') || 'en',
        depth: (searchParams.get('depth') as 'low' | 'medium' | 'deep') || 'low',
        persona: searchParams.get('persona') || 'teacher',
        parent: searchParams.get('parent'),
        isSelfReference: searchParams.get('selfReference') === 'true',
        isRegenerating: !!searchParams.get('_r'),
        useSearch: searchParams.get('useSearch') || 'false',
        mode: searchParams.get('mode'),
        ownerId: searchParams.get('ownerId'),
    }), [searchParams]);

    const navigateToMap = useCallback((id: string, topic?: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('mapId', id);
        if (topic) newParams.delete('topic'); // Use ID as primary
        newParams.delete('_r');
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [router, searchParams]);

    const changeLanguage = useCallback((langCode: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('lang', langCode);
        router.push(`/canvas?${newParams.toString()}`);
    }, [router, searchParams]);

    const regenerate = useCallback(() => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('_r', Date.now().toString());
        router.replace(`/canvas?${newParams.toString()}`);
    }, [router, searchParams]);

    const clearRegenFlag = useCallback(() => {
        if (searchParams.has('_r')) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('_r');
            const search = newParams.toString();
            router.replace(`${window.location.pathname}${search ? '?' + search : ''}`, { scroll: false });
        }
    }, [router, searchParams]);

    const getParamKey = useCallback(() => {
        return JSON.stringify({
            topic: params.topic,
            topic1: params.topic1,
            topic2: params.topic2,
            sessionId: params.sessionId,
            mapId: params.mapId,
            sharedMapId: params.sharedMapId,
            publicMapId: params.publicMapId,
            lang: params.lang,
            depth: params.depth,
            persona: params.persona,
            isSelfReference: params.isSelfReference,
            isRegenerating: params.isRegenerating,
            ownerId: params.ownerId,
        });
    }, [params]);

    return {
        params,
        navigateToMap,
        changeLanguage,
        regenerate,
        clearRegenFlag,
        getParamKey,
        router
    };
}
