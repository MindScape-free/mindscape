import { generateSearchContext } from '@/app/actions/generateSearchContext';

/**
 * Tool to search the web for real-time information
 */
export const webSearchTool = {
  name: 'get_web_info',
  description: 'Search the web for real-time information, news, and facts. Use this when the user asks about current events or topics outside your training data.',
  execute: async ({ query }: { query: string }) => {
    const result = await generateSearchContext({ query, depth: 'basic' });
    if (result.error) {
      return { error: result.error };
    }
    return {
      summary: result.data?.summary || 'No summary available.',
      sources: result.data?.sources.map(s => ({ title: s.title, url: s.url })) || [],
    };
  },
};

/**
 * Tool for mathematical calculations
 */
export const calculatorTool = {
  name: 'calculate',
  description: 'Perform mathematical calculations. Use this for complex math or to ensure precision.',
  execute: async ({ expression }: { expression: string }) => {
    try {
      // Simple safe eval for basic math
      const sanitized = expression.replace(/[^0-9+\-*/().\s,]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)();
      return { expression, result };
    } catch (err) {
      return { error: 'Failed to evaluate expression. Use standard mathematical operators.' };
    }
  },
};

/**
 * Tool to get current time and date
 */
export const timeTool = {
  name: 'get_current_time',
  description: 'Get the current date and time.',
  execute: async ({ timezone }: { timezone?: string }) => {
    return {
      time: new Date().toLocaleString('en-US', { timeZone: (timezone || undefined) as string | undefined }),
      timezone: timezone || 'Local',
    };
  },
};

export const defaultTools = [webSearchTool, calculatorTool, timeTool];
