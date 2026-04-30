import { tool } from '@openrouter/sdk/lib/tool.js';
import { z } from 'zod';
import { generateSearchContext } from '@/app/actions/generateSearchContext';

/**
 * Tool to search the web for real-time information
 */
export const webSearchTool = tool({
  name: 'get_web_info',
  description: 'Search the web for real-time information, news, and facts. Use this when the user asks about current events or topics outside your training data.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }) as any,
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
});

/**
 * Tool for mathematical calculations
 */
export const calculatorTool = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations. Use this for complex math or to ensure precision.',
  inputSchema: z.object({
    expression: z.string().describe('Math expression to evaluate (e.g., "2 + 2", "sqrt(16)")'),
  }) as any,
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
});

/**
 * Tool to get current time and date
 */
export const timeTool = tool({
  name: 'get_current_time',
  description: 'Get the current date and time.',
  inputSchema: z.object({
    timezone: z.string().optional().describe('Optional timezone (e.g., "UTC", "America/New_York")'),
  }) as any,
  execute: async ({ timezone }: { timezone?: string }) => {
    return {
      time: new Date().toLocaleString('en-US', { timeZone: (timezone || undefined) as string | undefined }),
      timezone: timezone || 'Local',
    };
  },
});

export const defaultTools = [webSearchTool, calculatorTool, timeTool];
