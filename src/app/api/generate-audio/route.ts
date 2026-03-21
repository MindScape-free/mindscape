import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { text, voice = 'alloy', apiKey } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required for audio generation.' }, { status: 401 });
        }

        console.log(`🔊 Generating TTS: Voice=${voice}, Auth=${!!apiKey}`);

        // Correct OpenAI-Compatible TTS Endpoint
        const response = await fetch('https://gen.pollinations.ai/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Pollinations TTS Failed:', response.status, errorText);

            // Handle specific error cases
            if (response.status === 401) {
                return NextResponse.json({ error: 'Invalid or missing API key for TTS.' }, { status: 401 });
            }

            throw new Error(`External TTS service error: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache', // Don't cache for dynamic content
            },
        });
    } catch (error: any) {
        console.error('🚨 TTS API Route Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to generate audio',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
