'use client';

import { useState, useCallback } from 'react';
import { MindMapData } from '@/types/mind-map';

interface UseExpansionOptions {
  data: MindMapData;
}

export function useExpansionState(options: UseExpansionOptions) {
  const { data } = options;

  const [openSubTopics, setOpenSubTopics] = useState<string[]>(
    data.mode === 'single' && data.subTopics && data.subTopics.length > 0 ? ['topic-0'] : []
  );
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openCompareNodes, setOpenCompareNodes] = useState<string[]>([]);
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const expandAll = useCallback(() => {
    if (data.mode === 'compare') {
      setIsAllExpanded(true);
    } else {
      const singleData = data;
      const allTopicIds = (singleData.subTopics || []).map((_, i) => `topic-${i}`);
      const allCategoryIds = (singleData.subTopics || []).flatMap((t, i) =>
        (t.categories || []).map((_, j) => `cat-${i}-${j}`)
      );
      setOpenSubTopics(allTopicIds);
      setOpenCategories(allCategoryIds);
    }
    setIsAllExpanded(true);
  }, [data]);

  const collapseAll = useCallback(() => {
    setOpenSubTopics([]);
    setOpenCategories([]);
    setOpenCompareNodes([]);
    setIsAllExpanded(false);
  }, []);

  const toggleSubTopic = useCallback((id: string) => {
    setOpenSubTopics(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setOpenCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleCompareNode = useCallback((id: string) => {
    setOpenCompareNodes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  return {
    openSubTopics,
    setOpenSubTopics,
    openCategories,
    setOpenCategories,
    openCompareNodes,
    setOpenCompareNodes,
    isAllExpanded,
    expandAll,
    collapseAll,
    toggleSubTopic,
    toggleCategory,
    toggleCompareNode,
  };
}
