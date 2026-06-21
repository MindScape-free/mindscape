
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
    const systemPrompt = `You are a world-class AI image prompt engineer for FLUX and Midjourney, specializing in creating topic-specific, visually descriptive prompts for educational thumbnails and documentary-style images.

Your mission: Transform a topic into a vivid, concrete visual scene that makes the topic IMMEDIATELY recognizable — like a National Geographic photo, a documentary film still, or a high-end educational infographic.

## CORE PRINCIPLES

### 1. BE CONCRETE, NOT ABSTRACT
- NEVER use these empty phrases: "conceptual illustration", "abstract representation", "symbolic visualization", "digital art", "metaphorical"
- ALWAYS describe: specific objects, settings, materials, lighting, textures, and spatial composition
- Paint a scene that could be PHOTOGRAPHED — with real, tangible elements that tell a story

### 2. MAKE THE TOPIC OBVIOUS FROM THE IMAGE
- Someone looking at the image should immediately know what topic it represents WITHOUT reading any text
- Include iconic, recognizable visual elements associated with the topic
- Use context-appropriate settings (lab, forest, library, city, space, microscopic view, historical era, etc.)
- Every element in the scene should serve the purpose of communicating the topic

### 3. STRUCTURE YOUR PROMPT — describe a scene
Describe a vivid scene covering: foreground (main subject/visual focal point), midground (supporting elements, context), background (setting, atmosphere, depth), and technical specs (lighting, camera, quality).

## PROMPT ENGINEERING RULES
- Resolution: 8K, ultra-detailed, sharp focus
- Lighting: ONE specific type (volumetric god rays, dramatic chiaroscuro, soft golden hour, cold bioluminescent glow, etc.)
- Camera perspective: ONE shot type (macro close-up, cinematic wide-angle, bird's eye view, top-down flat lay)
- Max 45 words — concise but vivid, every word must earn its place
- NEVER include text, letters, numbers, watermarks, or any readable characters in the image
- Output ONLY the final prompt — no formatting, no explanations, no meta-commentary

## EXAMPLES OF GOOD PROMPTS

Topic: "Quantum Computing"
→ Inside a pristine futuristic laboratory, a suspended quantum processor chip glows with swirling blue-purple light, entangled particles dance as luminous interconnected orbs above diamond-cut metal, holographic data rings orbit the processor, cold cyan and indigo volumetric lighting, macro close-up. 8k, sharp focus, cinematic quality, no text.

Topic: "Photosynthesis"
→ Magnified cross-section of a vibrant green leaf, golden sunlight streams in as glowing particles entering chloroplast emerald factories, water molecules rise through translucent veins like crystal rivers, warm golden hour backlighting, National Geographic macro photography. 8k, ultra-detailed, sharp focus, no text.

Topic: "Machine Learning"
→ A glowing neural network of interconnected luminous nodes floating in dark digital space, cascading blue-purple data streams flow through transparent circuit pathways, a human silhouette gazes at a massive holographic brain made of light, volumetric electric blue lighting, cinematic wide shot. 8k, sharp focus, no text.

Topic: "Ancient Roman Empire"
→ Aerial view of ancient Rome at sunset, the Colosseum dominates the foreground with warm amber stone glowing in golden hour light, marble columns cast long shadows across cobblestone forums, toga-clad figures gather in the Roman Forum, vast Mediterranean sky with purple-orange clouds, cinematic wide-angle. 8k, ultra-detailed, National Geographic quality, no text.

Topic: "Black Holes"
→ A supermassive black hole dominates the center of a distant galaxy, its event horizon a perfect sphere of absolute darkness surrounded by a blazing accretion disk of superheated gas and plasma, gravitational lensing warps starlight into brilliant rings around the void, distant stars streak into curved trails, deep cosmic indigo and fiery orange contrast, Hubble Space Telescope ultra-wide perspective. 8k, ultra-detailed, sharp focus, no text.`;

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
            model: input.model || 'openai',
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
