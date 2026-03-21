import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { topic, difficulty, apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API key is required for quiz generation.' }, { status: 401 });
        }

        console.log('🎯 Direct quiz API called:', { topic, difficulty, hasKey: !!apiKey });

        const systemPrompt = `You are an educational quiz generator. Generate a quiz with this EXACT JSON structure:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "question": "question text",
      "options": [
        {"id": "A", "text": "option A"},
        {"id": "B", "text": "option B"},
        {"id": "C", "text": "option C"},
        {"id": "D", "text": "option D"}
      ],
      "correctOptionId": "A",
      "conceptTag": "concept",
      "explanation": "explanation text"
    }
  ]
}

Generate 5-10 questions. Return ONLY valid JSON.`;

        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'mistral',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate a ${difficulty} quiz about: ${topic}` }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 16384 // Increased to prevent truncation
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pollinations error:', errorText);
            throw new Error(`Pollinations API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in response');
        }

        const quiz = JSON.parse(content);
        console.log('✅ Quiz generated successfully');

        return NextResponse.json({ success: true, data: quiz });
    } catch (error: any) {
        console.error('❌ Quiz generation error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
