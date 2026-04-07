import { NextResponse } from 'next/server';

// Hardcoded Fallback Models (Verified Stable)
const FALLBACK_MODELS = {
  'flux': { cost: 0.001, quality: 'high', description: 'Flux Schnell - Fast high-quality image generation', paid_only: false },
  'zimage': { cost: 0.002, quality: 'high', description: 'Z-Image Turbo - Fast 6B Flux with 2x upscaling', paid_only: false },
  'klein': { cost: 0.01, quality: 'high', description: 'FLUX.2 Klein 4B - Compact high-quality model', paid_only: false },
  'gptimage': { cost: 0.0105, quality: 'high', description: 'GPT Image 1 Mini - OpenAI lightweight gen', paid_only: false },
  'qwen-image': { cost: 0.03, quality: 'high', description: 'Qwen Image Plus - Alibaba High-fidelity', paid_only: false },
} as const;

// In-memory cache for dynamic models
let cachedModels: any = null;
let lastFetchTime = 0;
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Fetch and map models from Pollinations.ai live registry
 */
async function getDynamicModels() {
  const now = Date.now();
  console.log("🔍 [DynamicModels] Checking cache...");
  if (cachedModels && (now - lastFetchTime < CACHE_EXPIRY)) {
    console.log("✅ [DynamicModels] Using cached list.");
    return cachedModels;
  }

  console.log("🌐 [DynamicModels] Fetching from Pollinations...");
  try {
    const response = await fetch('https://gen.pollinations.ai/image/models', { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`Pollinations Status: ${response.status}`);
    
    const rawModels = await response.json();
    console.log(`📦 [DynamicModels] Received ${rawModels.length} models.`);
    const mapped: Record<string, any> = {};

    rawModels.forEach((m: any) => {
      // Filter for FREE IMAGE models only
      const isFree = m.paid_only !== true;
      const isImage = m.output_modalities?.includes('image');
      
      if (!m.name || !isFree || !isImage) return;

      const cost = parseFloat(m.pricing?.completionImageTokens || "0.04");
      
      mapped[m.name] = {
        cost,
        quality: cost < 0.005 ? 'rapid' : cost < 0.02 ? 'high' : 'ultra',
        description: m.description || `${m.name} Image Generation`,
        paid_only: false
      };
    });

    // Merge with fallback to ensure our core set always exists
    cachedModels = { ...FALLBACK_MODELS, ...mapped };
    lastFetchTime = now;
    console.log("✅ [DynamicModels] Successfully refreshed.");
    return cachedModels;
  } catch (err: any) {
    console.error("❌ Failed to fetch dynamic models, using fallbacks:", err.message);
    return FALLBACK_MODELS;
  }
}

type ModelName = keyof typeof FALLBACK_MODELS | string;

interface GenerateImageRequest {
  prompt: string;
  model?: string;
  style?: string;
  composition?: string;
  mood?: string;
  colorPalette?: string;
  lighting?: string;
  width?: number;
  height?: number;
  userId?: string;
  userApiKey?: string;
}

/**
 * Enhance prompt with style-specific keywords or cinematic defaults
 */
function applyStyleToPrompt(prompt: string, style?: string, composition?: string, mood?: string, colorPalette?: string, lighting?: string): string {
  const lowerPrompt = prompt.toLowerCase();
  let enhancedPrompt = prompt;

  // De-duplicate: If the prompt already contains these keywords (e.g. from an earlier "Enhance" click), don't add them again
  const lowerEnhanced = enhancedPrompt.toLowerCase();

  const addKeywords = (keywords: string) => {
    const kArray = keywords.split(',').map(k => k.trim());
    const newKeywords = kArray.filter(k => !lowerEnhanced.includes(k.toLowerCase()));
    if (newKeywords.length > 0) {
      enhancedPrompt += (enhancedPrompt.endsWith(',') ? ' ' : ', ') + newKeywords.join(', ');
    }
  };

  // Add composition keywords
  if (composition && composition !== 'none') {
    const compKeywords: Record<string, string> = {
      'close-up': 'extreme close-up shot, macro detail, shallow depth of field, sharp focus on subject',
      'wide-shot': 'wide cinematic pan, sweeping landscape, expansive view, immersive environment',
      'bird-eye': 'overlooking bird\'s eye view from high altitude, top-down perspective, scale and layout focus',
      'macro': 'macro photography, microscopic detail, intricate textures, extreme close-up',
      'low-angle': 'heroic low angle shot looking up, powerful perspective, imposing architectural scale'
    };
    if (compKeywords[composition]) addKeywords(compKeywords[composition]);
  }

  // Add mood keywords
  if (mood && mood !== 'none') {
    const moodKeywords: Record<string, string> = {
      'golden-hour': 'golden hour lighting, warm amber glow, long soft shadows, ethereal sunset atmosphere',
      'rainy': 'heavy rain, wet reflective surfaces, moody gray overcast lighting, atmospheric mist',
      'foggy': 'dense mysterious fog, low visibility, soft diffused light, hauntingly beautiful atmosphere',
      'neon': 'vibrant neon glow, electric colors, synthwave lighting, high contrast shadows',
      'mystical': 'enchanting magical aura, glowing particles, dreamlike luminance, spiritual atmosphere',
      'nocturnal': 'dim midnight lighting, deep blue moonlit shadows, calm nocturnal ambiance'
    };
    if (moodKeywords[mood]) addKeywords(moodKeywords[mood]);
  }

  // Add color palette keywords
  if (colorPalette && colorPalette !== 'none') {
    const paletteKeywords: Record<string, string> = {
      'warm': 'warm amber and orange tones, sunset color palette, cozy inviting warmth',
      'cool': 'cool blue and teal tones, icy clean color palette, serene atmosphere',
      'monochrome': 'black and white monochrome, dramatic contrast, desaturated tonal range',
      'vibrant': 'highly saturated vivid colors, bold chromatic intensity, eye-catching palette',
      'pastel': 'soft delicate pastel colors, muted gentle tones, dreamy watercolor palette',
      'earth': 'earthy brown green terracotta tones, organic natural color palette, grounding warmth',
      'neon-palette': 'electric neon colors, fluorescent pink blue green, high contrast glowing spectrum'
    };
    if (paletteKeywords[colorPalette]) addKeywords(paletteKeywords[colorPalette]);
  }

  // Add lighting keywords
  if (lighting && lighting !== 'none') {
    const lightingKeywords: Record<string, string> = {
      'natural': 'soft natural daylight, open shade, true-to-life color rendering',
      'studio': 'professional three-point studio lighting, clean catchlights, controlled exposure',
      'dramatic': 'chiaroscuro dramatic lighting, deep shadows, intense spotlight contrast',
      'backlit': 'strong backlit silhouette, rim-lit edges, glowing halo effect',
      'rim-light': 'precise rim lighting, edge-lit contours, subject separation from background',
      'volumetric': 'volumetric god rays, light shafts through atmosphere, cinematic haze',
      'candlelight': 'warm flickering candlelight, intimate low-key amber glow, romantic chiaroscuro'
    };
    if (lightingKeywords[lighting]) addKeywords(lightingKeywords[lighting]);
  }

  // If a specific style is provided, prioritize it
  if (style && style !== 'none' && style !== 'cinematic') {
    const styleKeywords: Record<string, string> = {
      'anime': 'masterpiece anime style, Studio Ghibli inspired, high quality cel shading, vibrant colors, clean lineart',
      '3d-render': 'hyper-realistic 3D render, Unreal Engine 5, Octane render, ray-tracing, intricate PBR materials, digital masterwork',
      'cyberpunk': 'neon noir aesthetic, futuristic cyberpunk cityscape, rain-slicked streets, chrome and glass, high-tech noir',
      'minimalist': 'clean minimalist design, elegant negative space, Bauhaus inspired, soft neutral tones, sophisticated simplicity',
      'watercolor': 'artistic watercolor painting, wet-on-wet technique, soft color bleeds, textured cold-press paper',
      'pencil': 'detailed graphite pencil sketch, cross-hatching, artistic hand-drawn texture, traditional art aesthetic',
      'polaroid': 'vintage 90s polaroid photo, intentional film grain, soft lens blur, nostalgic warm color grading',
      'pop-art': 'bold pop art style, Roy Lichtenstein inspired, halftone patterns, vibrant saturated primary colors, thick outlines',
      'oil-painting': 'textured oil on canvas, visible impasto brushstrokes, rich pigment layers, classical masterwork aesthetic',
      'pixel-art': 'crisp 16-bit pixel art, limited retro palette, clean grid-aligned pixels, nostalgic game aesthetic'
    };

    const keywords = styleKeywords[style] || '';
    if (keywords) addKeywords(keywords);
  } else if (!style || style === 'cinematic') {
    // Fallback to cinematic defaults if no major style is set
    const personKeywords = [
      'person', 'people', 'man', 'woman', 'leader', 'figure', 'celebrity',
      'scientist', 'artist', 'politician', 'entrepreneur', 'founder', 'ceo',
      'president', 'king', 'queen', 'emperor', 'philosopher', 'inventor',
      'author', 'writer', 'actor', 'musician', 'athlete', 'coach', 'teacher',
      'doctor', 'engineer', 'designer', 'developer', 'researcher', 'professor',
      'einstein', 'newton', 'tesla', 'jobs', 'gates', 'musk', 'bezos',
      'gandhi', 'lincoln', 'washington', 'churchill', 'napoleon', 'caesar',
      'da vinci', 'michelangelo', 'shakespeare', 'beethoven', 'mozart',
      'he ', 'she ', 'his ', 'her ', 'him ', 'himself', 'herself'
    ];

    const isPerson = personKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerEnhanced);
    });

    if (isPerson) {
      addKeywords('professional portrait photography, dramatic studio lighting, 8k resolution, cinematic composition, photorealistic, sharp focus');
    } else {
      addKeywords('cinematic landscape photography, dramatic lighting, ultra-detailed, 8k quality, depth of field, atmospheric rendering');
    }
  }

  return enhancedPrompt;
}

/**
 * Model registry for rotation
 */
const DEFAULT_ROTATION = ['qwen-image', 'flux', 'zimage', 'klein', 'gptimage'];


/**
 * POST /api/generate-image
 * 
 * Generate images using Pollinations.ai API
 * Supports user API keys with fallback to server key
 */
export async function POST(req: Request) {
  try {
    // Safety check: ensure body is present to avoid "Unexpected end of JSON input"
    if (!req.body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    let body: GenerateImageRequest;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      prompt,
      model: requestedModel = 'flux',
      style,
      composition,
      mood,
      colorPalette,
      lighting,
      width = 1024,
      height = 1024,
      userApiKey
    } = body;

    // Map legacy or incorrect model names to current valid models
    let model = requestedModel;
    const modelMapping: Record<string, string> = {
      // Old deprecated models
      'flux-realism': 'flux',
      'flux-cablyai': 'flux',
      'flux-anime': 'flux',
      'flux-3d': 'flux',
      'any-dark': 'flux',
      'flux-pro': 'flux',
      'turbo': 'flux',
      'flux-2-dev': 'flux',
      'klein-large': 'klein',
      'klein': 'klein',
      'dirtberry': 'flux',
      'dirtberry-pro': 'flux',
      'zimage': 'zimage',
      'imagen-4': 'flux',
      'grok-imagine': 'grok-imagine',
    };
    if (modelMapping[model]) model = modelMapping[model];

    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const POLLINATIONS_MODELS = await getDynamicModels();

    // Validate inputs

    console.log(`🎨 Generating image with model: ${model} (${userApiKey ? 'User Key' : 'Server Key'})`);

    // Determine which API key to use (User Key Priority, Fallback to Server Key)
    let apiKey = (userApiKey && userApiKey.trim() !== "") ? userApiKey : process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ No API key found (User or Server). Image generation may fail or be restricted.");
      return NextResponse.json(
        { error: 'No API key available. Please add your Pollinations API key in your profile settings.' },
        { status: 401 }
      );
    }

    // Enhance prompt using the new style-aware logic
    const enhancedPrompt = applyStyleToPrompt(prompt, style, composition, mood, colorPalette, lighting);

    // Implement model rotation for higher success rate
    let currentModel = model;
    
    // For guest users (no API key), only use free models
    const rotationPool = userApiKey ? Object.keys(POLLINATIONS_MODELS) : DEFAULT_ROTATION;
    
    let rotationIndex = rotationPool.indexOf(currentModel as any);
    if (rotationIndex === -1) rotationIndex = 0;
    currentModel = rotationPool[rotationIndex];

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🎨 Attempt ${attempt + 1}: Generating image with model: ${currentModel}`);

        // Build Pollinations API URL with extra protection params
        const baseUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(enhancedPrompt)}`;
        const params = new URLSearchParams({
          model: currentModel,
          width: width.toString(),
          height: height.toString(),
          seed: Math.floor(Math.random() * 1000000).toString(),
          nologo: 'true',
          enhance: 'false'
        });

        const imageUrl = `${baseUrl}?${params}`;

        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'image/jpeg, image/png'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          const isModeration = errorText.includes('moderation_blocked') || errorText.includes('safety system');
          const isRetryable = response.status >= 500 || response.status === 429 || response.status === 530;
          const isRotationCandidate = isRetryable || isModeration || response.status === 401 || response.status === 403;

          console.error(`❌ Pollinations API error [Model: ${currentModel}]: ${response.status} - ${errorText.substring(0, 100)}...`);

          if (attempt < maxRetries - 1) {
            if (isRotationCandidate) {
              rotationIndex = (rotationIndex + 1) % rotationPool.length;
              currentModel = rotationPool[rotationIndex];
              console.warn(`🔄 Rotating to next model: ${currentModel} due to ${response.status}...`);
            } else {
              console.warn(`⏳ Retrying same model: ${currentModel} due to transient error...`);
            }

            // Exponential backoff
            const delay = 1000 * (attempt + 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          return NextResponse.json(
            {
              error: `Image generation failed: ${response.status}`,
              details: errorText,
              suggestion: response.status === 401 || response.status === 403
                ? (userApiKey ? 'Your API key may be invalid or restricted. Try clearing it in settings or check your balance.' : 'Server API key error. Please try again later.')
                : 'Moderation or capacity error. Please try a more general prompt.'
            },
            { status: response.status }
          );
        }

        // Success! Convert to base64
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64Image}`;

        console.log(`✅ Image generated with model ${currentModel} (${Math.round(buffer.length / 1024)} KB)`);

        return NextResponse.json({
          success: true,
          imageUrl: dataUrl,
          model: currentModel,
          cost: (POLLINATIONS_MODELS as any)[currentModel]?.cost || 0.04,
          quality: (POLLINATIONS_MODELS as any)[currentModel]?.quality || 'custom',
          size: { width, height },
          usingUserKey: !!userApiKey
        });

      } catch (error: any) {
        console.error(`💥 Error in attempt ${attempt + 1}:`, error);
        if (attempt === maxRetries - 1) throw error;
      }
    }

    return NextResponse.json({ error: 'Failed after multiple attempts' }, { status: 500 });

  } catch (error: any) {
    console.error('💥 Fatal error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-image/models
 * 
 * Get list of available models
 */
export async function GET() {
  const models = await getDynamicModels();
  return NextResponse.json({
    models: Object.entries(models).map(([name, info]) => ({
      name,
      ...(info as any)
    }))
  });
}
