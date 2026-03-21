// scripts/test-cache-key.js
const { apiCache } = require('../src/lib/cache');

// Mock data
const mainTopic = "JavaScript";
const subCategoryName = "Closures";
const usePdfContext = false;

function getCacheKey(level) {
    return `explain_${subCategoryName}_${mainTopic}_${level}_${usePdfContext ? 'aware' : 'simple'}`;
}

console.log("🚀 Starting Cache Key Verification...");

const levels = ['Beginner', 'Intermediate', 'Expert'];

// 1. Initial generation for each level
levels.forEach(level => {
    const key = getCacheKey(level);
    const cached = apiCache.get(key);

    if (!cached) {
        console.log(`✅ [MISS] No cache for ${level}. Generating new content...`);
        apiCache.set(key, { points: [`This is an ${level} explanation.`] });
    }
});

// 2. Verify subsequent hits
console.log("\n🔄 Verifying hits for existing levels...");
levels.forEach(level => {
    const key = getCacheKey(level);
    const cached = apiCache.get(key);

    if (cached) {
        console.log(`✅ [HIT] Found cached ${level} content:`, cached.points[0]);
    } else {
        console.error(`❌ [ERROR] Cache missed for ${level}!`);
    }
});

// 3. Verify uniqueness
console.log("\n🧪 Verifying key uniqueness...");
const keys = levels.map(getCacheKey);
const uniqueKeys = new Set(keys);

if (uniqueKeys.size === levels.length) {
    console.log("✅ [SUCCESS] All cache keys are unique per level.");
} else {
    console.error("❌ [FAILURE] Cache keys are overlapping!");
}

console.log("\n🎉 Cache Verification Complete!");
