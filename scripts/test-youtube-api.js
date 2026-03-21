import dotenv from 'dotenv';
import { fetchTranscriptParts, getVideoMetadata } from '../src/utils/youtube/transcript.js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function test() {
    const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
    console.log(`Testing YouTube API for video: ${testVideoId}`);

    try {
        const metadata = await getVideoMetadata(testVideoId);
        console.log('\n--- Metadata Response ---');
        console.log(JSON.stringify(metadata, null, 2));

        if (metadata?.description) {
            console.log('\n✅ Successfully fetched description using API Key!');
        } else {
            console.log('\n❌ Description missing. Check if YOUTUBE_API_KEY is correct in .env.local');
        }

        try {
            const transcript = await fetchTranscriptParts(testVideoId);
            console.log(`\n✅ Transcript fetched: ${transcript.length} parts`);
        } catch (e) {
            console.log('\nℹ️ Transcript fetch failed (expected for some videos):', e.message);
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

test();
