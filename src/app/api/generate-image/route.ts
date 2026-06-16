import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, createRateLimitResponse, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const maxDuration = 60; // 60s timeout for serverless environments

// ── CORS Headers ───────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function addCorsHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

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

    cachedModels = mapped;
    lastFetchTime = now;
    console.log("✅ [DynamicModels] Successfully refreshed.");
    return cachedModels;
  } catch (err: any) {
    console.error("❌ Failed to fetch dynamic models:", err.message);
    throw err;
  }
}



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
    // Only explicit named individuals should trigger portrait mode, not generic roles
    const explicitPersonKeywords = [
      'einstein', 'newton', 'tesla', 'jobs', 'gates', 'musk', 'bezos',
      'gandhi', 'lincoln', 'washington', 'churchill', 'napoleon', 'caesar',
      'da vinci', 'michelangelo', 'shakespeare', 'beethoven', 'mozart',
      'euler', 'hawking', 'curie', 'planck', 'feynman',
      'galileo', 'kepler', 'darwin', 'freud',
      'aristotle', 'plato', 'socrates', 'confucius',
      'obama', 'macron', 'merkel', 'putin', 'trump', 'biden', 'harris',
      'zuckerberg', 'wozniak', 'hopper', 'lovelace',
      'turing', 'babbage', 'stroustrup', 'torvalds', 'stallman',
      'hemingway', 'dostoevsky', 'tolstoy', 'orwell',
      'picasso', 'van gogh', 'monet', 'dali', 'warhol',
      'marilyn monroe', 'elvis', 'michael jackson', 'kobe bryant'
    ];

    const isExplicitPerson = explicitPersonKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerEnhanced);
    });

    if (isExplicitPerson) {
      addKeywords('professional portrait photography, dramatic studio lighting, 8k resolution, cinematic composition, photorealistic, sharp focus');
    } else {
      addKeywords('cinematic landscape photography, dramatic lighting, ultra-detailed, 8k quality, depth of field, atmospheric rendering');
    }
  }

  return enhancedPrompt;
}

/**
 * POST /api/generate-image
 * 
 * Generate images using Pollinations.ai API
 * Supports user API keys with fallback to server key
 */
/**
 * OPTIONS /api/generate-image
 *
 * Handle CORS preflight requests.
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  // ── Rate Limiting ────────────────────────────────────────────────────
  const clientId = getClientIdentifier(req);
  const rateLimitResult = rateLimit(clientId, 'ai');
  const rateLimitResponse = createRateLimitResponse(rateLimitResult);
  if (rateLimitResponse) {
    return addCorsHeaders(new NextResponse(await rateLimitResponse.text(), {
      status: 429,
      headers: Object.fromEntries(rateLimitResponse.headers.entries()),
    }));
  }

  try {
    // Safety check: ensure body is present to avoid "Unexpected end of JSON input"
    if (!req.body) {
      return addCorsHeaders(NextResponse.json({ error: 'Request body is required' }, { status: 400 }));
    }

    let body: GenerateImageRequest;
    try {
      body = await req.json();
    } catch (e) {
      return addCorsHeaders(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }));
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
      userId,
      userApiKey
    } = body;

    // Safety caps for dimensions
    const safeWidth = Math.min(Math.max(width, 256), 1280);
    const safeHeight = Math.min(Math.max(height, 256), 1280);

    // Map legacy or incorrect model names to current valid models
    let model = requestedModel;
    const modelMapping: Record<string, string> = {
      'flux-realism': 'flux',
      'flux-cablyai': 'flux',
      'flux-anime': 'flux',
      'flux-3d': 'flux',
      'any-dark': 'flux',
      'flux-pro': 'flux',
      'turbo': 'zimage',
      'flux-2-dev': 'flux',
      'klein-large': 'klein',
      'dirtberry': 'flux',
      'dirtberry-pro': 'flux',
      'imagen-4': 'seedream',
      'grok-imagine': 'flux',
      'nanobanana-pro': 'nanobanana-2',
      'seedream5': 'seedream',
      'seedream-pro': 'seedream',
      'wan-image-pro': 'wan-image',
    };
    if (modelMapping[model]) model = modelMapping[model];

    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      ));
    }

    const POLLINATIONS_MODELS = await getDynamicModels();

    // Validate inputs

    console.log(`🎨 Generating image with model: ${model} (${userApiKey ? 'User Key' : 'Server Key'})`);

    // Determine which API key to use (User Key Priority, Fallback to Server Key)
    let apiKey = (userApiKey && userApiKey.trim() !== "") ? userApiKey : process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ No API key found (User or Server). Image generation may fail or be restricted.");
      return addCorsHeaders(NextResponse.json(
        { error: 'No API key available. Please add your Pollinations API key in your profile settings.' },
        { status: 401 }
      ));
    }

    // Enhance prompt using the new style-aware logic
    const enhancedPrompt = applyStyleToPrompt(prompt, style, composition, mood, colorPalette, lighting);

    // Implement model rotation for higher success rate
    let currentModel = model;
    
    const rotationPool = Object.keys(POLLINATIONS_MODELS);
    
    let rotationIndex = rotationPool.indexOf(currentModel as any);
    if (rotationIndex === -1) {
      console.warn(`⚠️ Requested model ${currentModel} not found in pool, using ${rotationPool[0]}`);
      rotationIndex = 0;
    }
    currentModel = rotationPool[rotationIndex];

    const maxRetries = 5; // Increased retries for better stability

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🎨 Attempt ${attempt + 1}/${maxRetries}: Generating image with model: ${currentModel}`);

        // Build Pollinations API URL
        const baseUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(enhancedPrompt)}`;
        const params = new URLSearchParams({
          model: currentModel,
          width: safeWidth.toString(),
          height: safeHeight.toString(),
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
          },
          signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const isModeration = errorText.includes('moderation_blocked') || errorText.includes('safety system');
          const is429 = response.status === 429;
          const is402QueueFull = response.status === 402 && errorText.includes('Queue full');
          const isRetryable = response.status >= 500 || is429 || response.status === 530 || is402QueueFull;
          const isRotationCandidate = isRetryable || isModeration || response.status === 401 || response.status === 403 || is402QueueFull;

          console.error(`❌ Pollinations API error [Model: ${currentModel}]: ${response.status} - ${errorText.substring(0, 100)}...`);

          if (attempt < maxRetries - 1) {
            if (isRotationCandidate) {
              rotationIndex = (rotationIndex + 1) % rotationPool.length;
              currentModel = rotationPool[rotationIndex];
              console.warn(`🔄 Rotating to next model: ${currentModel} due to ${response.status}...`);
            }

            // Exponential backoff with jitter
            const baseDelay = is429 ? 3000 : is402QueueFull ? 500 : 1000;
            const delay = (baseDelay * Math.pow(2, attempt)) + (Math.random() * 500);
            console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          return addCorsHeaders(NextResponse.json(
            {
              error: `Image generation failed: ${response.status}`,
              details: errorText,
              suggestion: is429 
                ? 'The AI provider is temporarily rate-limiting requests. We are retrying with different models, but please try again in a few moments.'
                : response.status === 401 || response.status === 403
                  ? (userApiKey ? 'Your API key may be invalid or restricted.' : 'Server API key error.')
                  : 'Moderation or capacity error. Please try a more general prompt.'
            },
            { status: response.status }
          ));
        }

        // Success! Convert to base64
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64Image}`;

        console.log(`✅ Image generated with model ${currentModel} (${Math.round(buffer.length / 1024)} KB)`);

        return addCorsHeaders(NextResponse.json({
          success: true,
          imageUrl: dataUrl,
          model: currentModel,
          cost: (POLLINATIONS_MODELS as any)[currentModel]?.cost || 0.04,
          quality: (POLLINATIONS_MODELS as any)[currentModel]?.quality || 'custom',
          size: { width: safeWidth, height: safeHeight },
          usingUserKey: !!userApiKey
        }));

      } catch (error: any) {
        const isTimeout = error.name === 'AbortError' || error.message.includes('timeout');
        console.error(`💥 Error in attempt ${attempt + 1}:`, error.message);
        
        if (attempt < maxRetries - 1) {
          rotationIndex = (rotationIndex + 1) % rotationPool.length;
          currentModel = rotationPool[rotationIndex];
          const delay = 1000 * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (attempt === maxRetries - 1) throw error;
      }
    }

    return addCorsHeaders(NextResponse.json({ error: 'Failed after multiple attempts' }, { status: 500 }));

  } catch (error: any) {
    console.error('💥 Fatal error generating image:', error);
    return addCorsHeaders(NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    ));
  }
}

/**
 * GET /api/generate-image/models
 * 
 * Get list of available models
 */
export async function GET() {
  const models = await getDynamicModels();
  return addCorsHeaders(NextResponse.json({
    models: Object.entries(models).map(([name, info]) => ({
      name,
      ...(info as any)
    }))
  }));
}
