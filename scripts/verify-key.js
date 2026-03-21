import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.YOUTUBE_API_KEY;
const videoId = 'dQw4w9WgXcQ';

if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY is missing in your .env or .env.local file.');
    process.exit(1);
}

const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

console.log(`Testing YouTube API Key for video: ${videoId}`);

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.items && data.items.length > 0) {
            console.log('✅ API Key is VALID!');
            console.log('Video Title:', data.items[0].snippet.title);
            console.log('Channel:', data.items[0].snippet.channelTitle);
            console.log('Description length:', data.items[0].snippet.description.length);
        } else {
            console.log('❌ API Key test failed or video not found.');
            console.log('Response:', JSON.stringify(data, null, 2));
        }
    })
    .catch(err => {
        console.error('❌ Error testing API Key:', err);
    });
