import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic') || 'MindScape AI';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0D0D0D',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #8B5CF6 0%, transparent 80%)',
            color: 'white',
            padding: '40px',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
             <img 
               src="https://mindscape-free.vercel.app/MindScape-Logo.png" 
               width="80" 
               height="80" 
               style={{ marginRight: '20px' }}
             />
             <div style={{ fontSize: '60px', fontWeight: 'bold' }}>MindScape</div>
          </div>
          <div
            style={{
              fontSize: '40px',
              textAlign: 'center',
              marginTop: '40px',
              maxWidth: '800px',
              lineHeight: 1.4,
              opacity: 0.9,
            }}
          >
            {topic}
          </div>
          <div
            style={{
              fontSize: '20px',
              marginTop: '60px',
              color: '#A1A1AA',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            AI-Powered Knowledge Visualization
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(`Failed to generate OG image: ${e.message}`);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
