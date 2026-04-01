
'use server';

import { z } from 'zod';
import { generateContent, AIProvider } from '@/ai/client-dispatcher';

const EnhanceImagePromptInputSchema = z.object({
    prompt: z.string(),
    style: z.string().optional(),
    composition: z.string().optional(),
    mood: z.string().optional(),
    colorPalette: z.string().optional(),
    lighting: z.string().optional(),
});
export type EnhanceImagePromptInput = z.infer<typeof EnhanceImagePromptInputSchema>;

const EnhanceImagePromptOutputSchema = z.object({ enhancedPrompt: z.string() });
export type EnhanceImagePromptOutput = z.infer<typeof EnhanceImagePromptOutputSchema>;

const STYLE_MAP: Record<string, string> = {
    'cinematic':    'movie-like lighting, dramatic shadows, anamorphic lens flares, high-budget film aesthetic',
    '3d-render':    'Unreal Engine 5, Octane render, ray-tracing, intricate PBR materials',
    'anime':        'Studio Ghibli aesthetic, vibrant cel-shading, emotional atmospheric lighting',
    'minimalist':   'clean lines, negative space, soft neutral colors, high-end design magazine aesthetic',
    'cyberpunk':    'neon noir lighting, rainy streets, holographic interfaces, pink/blue color palette',
    'watercolor':   'soft bleeding edges, textured paper, vibrant washes, organic color blending',
    'pencil':       'fine graphite lines, cross-hatching, realistic shading, hand-drawn sketch on paper',
    'polaroid':     'vintage film grain, washed-out colors, soft focus, nostalgic 90s polaroid look',
    'pop-art':      'bold halftone patterns, vibrant saturated colors, thick black outlines, Warhol-inspired',
    'oil-painting': 'rich impasto textures, visible brushstrokes, classic canvas, masterwork aesthetic',
    'pixel-art':    'sharp 16-bit sprites, limited color palette, clean grid alignment, retro gaming',
};

export async function enhanceImagePrompt(
    input: EnhanceImagePromptInput & { apiKey?: string; provider?: AIProvider; strict?: boolean; model?: string }
): Promise<EnhanceImagePromptOutput> {
    const systemPrompt = `You are a world-class AI image prompt engineer for FLUX, Midjourney, and Stable Diffusion.
Transform a basic concept into a professional, highly detailed image prompt.

RULES:
- Technical: include lighting (1 type), camera (1 spec), resolution (1 descriptor).
- Artistic: choose 1–2 specific textures or materials — no redundancy.
- Max 1–2 descriptors per attribute (style, mood, composition, color, lighting).
- Avoid repeating the same descriptor in different forms.
- Output ONLY the final enhanced prompt — no intro, no meta-commentary.`;

    const styleCtx = input.style ? `\nStyle: ${STYLE_MAP[input.style] || input.style}` : '';
    const compCtx = input.composition && input.composition !== 'none' ? `\nComposition: ${input.composition} camera angle` : '';
    const moodCtx = input.mood && input.mood !== 'none' ? `\nMood: ${input.mood} atmosphere` : '';
    const colorCtx = input.colorPalette && input.colorPalette !== 'none' ? `\nColor: ${input.colorPalette} palette` : '';
    const lightCtx = input.lighting && input.lighting !== 'none' ? `\nLighting: ${input.lighting}` : '';

    const userPrompt = `Concept: "${input.prompt}"${styleCtx}${compCtx}${moodCtx}${colorCtx}${lightCtx}\n\nCreate a professional-grade prompt.`;

    try {
        const result = await generateContent({
            provider: input.provider || 'pollinations',
            apiKey: input.apiKey,
            model: 'qwen-coder',
            systemPrompt,
            userPrompt,
        });
        const enhanced = typeof result === 'string' ? result : (result.enhancedPrompt || result.prompt || JSON.stringify(result));
        return { enhancedPrompt: enhanced };
    } catch (e) {
        console.error('❌ Prompt enhancement failed, using original:', e);
        return { enhancedPrompt: input.prompt };
    }
}
