import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { topic, difficulty, apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API key is required for quiz generation.' }, { status: 401 });
        }

        const systemPrompt = `SYSTEM GUARANTEES:
- Output MUST be valid JSON (no markdown, no extra text)
- If invalid → internally self-correct before final output
- Do NOT explain, only generate

You are an educational quiz generator.

QUALITY RULES:
- No duplicate questions.
- Wrong options must be plausible (not obviously incorrect).
- Ensure even coverage across different aspects of the topic.
- Each question tests a distinct concept.

Generate a quiz with this EXACT JSON structure:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": [
        {"id": "A", "text": "Plausible option"},
        {"id": "B", "text": "Plausible option"},
        {"id": "C", "text": "Plausible option"},
        {"id": "D", "text": "Plausible option"}
      ],
      "correctOptionId": "A",
      "conceptTag": "specific-concept",
      "explanation": "Why this answer is correct."
    }
  ]
}

Generate 5–10 questions. Return ONLY valid JSON.`;

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
                    { role: 'user', content: `Generate a ${difficulty} quiz about: ${topic}` },
                ],
                response_format: { type: 'json_object' },
                max_tokens: 16384,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pollinations error:', errorText);
            throw new Error(`Pollinations API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('No content in response');

        // Runtime JSON validation with self-correction retry
        let quiz: any;
        try {
            quiz = JSON.parse(content);
        } catch {
            console.warn('⚠️ Quiz JSON parse failed, attempting self-correction...');
            const fixResponse = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'mistral',
                    messages: [
                        { role: 'system', content: 'Fix JSON formatting only. Do not change content. Return ONLY valid JSON.' },
                        { role: 'user', content: content },
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 16384,
                }),
            });
            if (fixResponse.ok) {
                const fixData = await fixResponse.json();
                quiz = JSON.parse(fixData.choices?.[0]?.message?.content || '{}');
            } else {
                throw new Error('JSON self-correction failed');
            }
        }

        return NextResponse.json({ success: true, data: quiz });
    } catch (error: any) {
        console.error('❌ Quiz generation error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
