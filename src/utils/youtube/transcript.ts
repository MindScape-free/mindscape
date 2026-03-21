import { YoutubeTranscript } from 'youtube-transcript';

export interface VideoMetadata {
  title: string;
  author_name: string;
  thumbnail_url: string;
  description?: string; // Added description for better fallback
}

/**
 * Fetches detailed metadata using the official YouTube Data API v3.
 * Requires YOUTUBE_API_KEY in environment.
 */
async function fetchYouTubeMetadata(videoId: string): Promise<Partial<VideoMetadata> | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    console.warn('DEBUG: YOUTUBE_API_KEY not configured, skipping official API fetch.');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const item = data.items?.[0];
    if (!item) return null;

    return {
      title: item.snippet.title,
      author_name: item.snippet.channelTitle,
      thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      description: item.snippet.description
    };
  } catch (error) {
    console.error('DEBUG: YouTube API fetch error:', error);
    return null;
  }
}

export interface TranscriptPart {
  text: string;
  duration: number;
  offset: number;
}

/**
 * Fetches the raw transcript parts for a given YouTube video ID.
 */
export async function fetchTranscriptParts(videoId: string): Promise<TranscriptPart[]> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript found for this video.');
    }

    return transcript.map(part => ({
      text: decodeHtmlEntities(part.text),
      duration: part.duration,
      offset: part.offset
    }));
  } catch (error: any) {
    console.error('DEBUG: YouTube transcript fetch error details:', error.message || error);
    if (error.message?.includes('Could not find transcript')) {
      throw new Error('Transcripts are disabled or unavailable for this video.');
    }
    throw new Error('Failed to fetch video transcript. Please try another video.');
  }
}

/**
 * Normalizes transcript parts into a single string or segmented text.
 * @param parts The raw transcript parts
 * @param segmentSeconds Optional: if provided, groups text into segments of this duration (in seconds)
 */
export function normalizeTranscript(parts: TranscriptPart[], segmentSeconds?: number): string {
  if (!segmentSeconds) {
    return parts
      .map((part) => part.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Segmented normalization
  const segments: string[] = [];
  let currentSegmentText: string[] = [];
  let currentSegmentStartTime = 0;

  parts.forEach((part) => {
    if (part.offset - currentSegmentStartTime >= segmentSeconds) {
      if (currentSegmentText.length > 0) {
        segments.push(`[${Math.floor(currentSegmentStartTime)}s] ${currentSegmentText.join(' ')}`);
      }
      currentSegmentText = [part.text];
      currentSegmentStartTime = part.offset;
    } else {
      currentSegmentText.push(part.text);
    }
  });

  if (currentSegmentText.length > 0) {
    segments.push(`[${Math.floor(currentSegmentStartTime)}s] ${currentSegmentText.join(' ')}`);
  }

  return segments.join('\n\n');
}

/**
 * Helper to decode common HTML entities in transcripts.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Legacy wrapper for backward compatibility or simple use cases.
 */
export async function fetchTranscript(videoId: string): Promise<string> {
  const parts = await fetchTranscriptParts(videoId);
  return normalizeTranscript(parts);
}

/**
 * Fetches basic metadata for a YouTube video using oEmbed.
 */
export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  try {
    // 1. Try official YouTube Data API first for rich metadata (description)
    const officialData = await fetchYouTubeMetadata(videoId);
    if (officialData && officialData.title) {
      console.log('DEBUG: Metadata fetched via official API');
      return officialData as VideoMetadata;
    }

    // 2. Fallback to oEmbed (limited data, but no key required)
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    console.log('DEBUG: Falling back to oEmbed for metadata:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('DEBUG: Metadata response NOT OK:', response.status);
      return null;
    }
    const data = await response.json() as VideoMetadata;
    console.log('DEBUG: Metadata fetched successfully via oEmbed:', data.title);
    return data;
  } catch (error: any) {
    console.error('DEBUG: Error fetching YouTube metadata:', error.message || error);
    return null;
  }
}
