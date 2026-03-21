
'use server';

/**
 * @fileOverview Enhances a simple user prompt for better image generation results.
 *
 * - enhanceImagePrompt - A function that takes a basic prompt and returns a detailed, artistic one.
 * - EnhanceImagePromptInput - The input type for the function.
 * - EnhanceImagePromptOutput - The return type for the function.
 */

import { z } from 'zod';

const EnhanceImagePromptInputSchema = z.object({
    prompt: z.string().describe('The user-provided prompt to be enhanced.'),
    style: z.string().optional().describe('An optional artistic style to apply.'),
    composition: z.string().optional().describe('An optional camera composition/angle.'),
    mood: z.string().optional().describe('An optional mood or lighting atmosphere.'),
    colorPalette: z.string().optional().describe('An optional color palette preference.'),
    lighting: z.string().optional().describe('An optional lighting technique.'),
});
export type EnhanceImagePromptInput = z.infer<
    typeof EnhanceImagePromptInputSchema
>;

const EnhanceImagePromptOutputSchema = z.object({
    enhancedPrompt: z
        .string()
        .describe('The detailed, artistic prompt for the image generation model.'),
});
export type EnhanceImagePromptOutput = z.infer<
    typeof EnhanceImagePromptOutputSchema
>;

import { generateContent, AIProvider } from '@/ai/client-dispatcher';

export async function enhanceImagePrompt(
    input: EnhanceImagePromptInput & { apiKey?: string; provider?: AIProvider; strict?: boolean; model?: string }
): Promise<EnhanceImagePromptOutput> {
    const systemPrompt = `You are a world-class AI image prompt engineer for high-end generators like FLUX, Midjourney, and Stable Diffusion.
Your goal is to transform a basic concept into a professional, highly detailed, and visually stunning image prompt.

Guidelines:
- Technical Perfection: Include details about lighting (rim lighting, global illumination, volumetric), camera (85mm lens, f/1.8, bokeh), and resolution (highly detailed, 8k, ray traced).
- Artistic Nuance: Choose specific textures, materials, and atmospheric effects.
- Directness: Output ONLY the final enhanced prompt. No introductions or meta-commentary.
- Context Fidelity: If a style, composition, or mood is provided, infuse the prompt with the technical DNA of those specific choices.`;

    const styleInstructions: Record<string, string> = {
        'cinematic': 'Use movie-like lighting, dramatic shadows, anamorphic lens flares, and high-budget film aesthetic.',
        '3d-render': 'Use Unreal Engine 5 aesthetic, Octane render, ray-tracing, intricate PBR materials, and clean digital perfection.',
        'anime': 'Studio Ghibli aesthetic, hand-painted textures, vibrant cel-shading, and emotional atmospheric lighting.',
        'minimalist': 'Clean lines, negative space, soft neutral colors, high-end design magazine aesthetic, and elegant simplicity.',
        'cyberpunk': 'Neon noir lighting, rainy streets, holographic interfaces, gritty high-tech low-life aesthetic, and vibrant pink/blue color pallete.',
        'watercolor': 'Soft bleeding edges, textured paper, vibrant washes, artistic hand-painted style with organic color blending.',
        'pencil': 'Fine graphite lines, cross-hatching, realistic shading, hand-drawn sketch aesthetic on paper.',
        'polaroid': 'Vintage film grain, washed out colors, soft focus, authentic nostalgic 90s polaroid photo look.',
        'pop-art': 'Bold halftone patterns, vibrant saturated colors, thick black outlines, inspired by Andy Warhol and Roy Lichtenstein.',
        'oil-painting': 'Rich impasto textures, visible brushstrokes, classic canvas feel, timeless masterwork oil painting aesthetic.',
        'pixel-art': 'Sharp 16-bit sprites, limited color palette, clean grid alignment, nostalgic retro gaming aesthetic.',
    };

    const compositionContext = input.composition && input.composition !== 'none' ? `\nComposition Context: Use a ${input.composition} camera angle.` : '';
    const moodContext = input.mood && input.mood !== 'none' ? `\nMood Context: Atmospheric ${input.mood} lighting and environment.` : '';
    const styleContext = input.style ? `\nStyle Context: ${styleInstructions[input.style] || input.style}` : '';
    const colorContext = input.colorPalette && input.colorPalette !== 'none' ? `\nColor Palette: Use a ${input.colorPalette} color scheme throughout the image.` : '';
    const lightingContext = input.lighting && input.lighting !== 'none' ? `\nLighting Technique: Apply ${input.lighting} lighting for the scene.` : '';

    const userPrompt = `Concept to enhance: "${input.prompt}"${styleContext}${compositionContext}${moodContext}${colorContext}${lightingContext}\n\nCreate a professional-grade prompt that captures this perfectly.`;

    try {
        const result = await generateContent({
            provider: input.provider || 'pollinations',
            apiKey: input.apiKey,
            model: 'qwen-coder', // Fast and reliable for text expansion
            systemPrompt,
            userPrompt,
        });

        // The dispatcher handles JSON and plain text. Since we didn't provide a schema and the system prompt says "Output ONLY", 
        // it should return the string directly or wrapped if the dispatcher forced JSON.
        const enhancedText = typeof result === 'string' ? result : (result.enhancedPrompt || result.prompt || JSON.stringify(result));

        console.log('✨ Prompt Enhanced:', enhancedText);
        return { enhancedPrompt: enhancedText };
    } catch (error) {
        console.error('❌ Failed to enhance prompt, falling back to original:', error);
        return { enhancedPrompt: input.prompt };
    }
}
