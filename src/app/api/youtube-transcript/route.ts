import { NextRequest, NextResponse } from 'next/server';
import { fetchTranscript, getVideoMetadata } from '@/utils/youtube/transcript';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const [transcript, metadata] = await Promise.all([
      fetchTranscript(videoId).catch(() => 'Transcript unavailable.'),
      getVideoMetadata(videoId).catch(() => null)
    ]);

    return NextResponse.json({
      title: metadata?.title || 'YouTube Video',
      transcript: transcript
    });

  } catch (error: any) {
    console.error('YouTube transcript error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
