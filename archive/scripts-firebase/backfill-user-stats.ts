/**
 * Backfill Script: Compute aggregate statistics for all users
 * 
 * This script:
 * 1. Iterates through all users
 * 2. Scans their current mindmaps collection
 * 3. Computes modeCounts, depthCounts, sourceCounts, personaCounts
 * 4. Updates user documents with new statistics (version: 2)
 * 
 * IMPORTANT: This only backfills CURRENT maps. Deleted maps are not recoverable.
 * The isBackfilledPartial flag will be set to true to indicate incomplete data.
 * 
 * Usage:
 *   npx ts-node --esm scripts/backfill-user-stats.ts
 * 
 * Or run directly with Node if compiled:
 *   node dist/scripts/backfill-user-stats.js
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

interface MapData {
    mode?: string;
    sourceFileType?: string;
    sourceType?: string;
    sourceUrl?: string;
    videoId?: string;
    depth?: string;
    nodeCount?: number;
    aiPersona?: string;
}

interface UserStatistics {
    modeCounts: Record<string, number>;
    depthCounts: Record<string, number>;
    sourceCounts: Record<string, number>;
    personaCounts: Record<string, number>;
    version: number;
    isBackfilledPartial: boolean;
}

function normalizeMapMode(mode?: string, sourceFileType?: string, sourceFileContent?: string): string {
    if (!mode || mode === 'single') {
        const isMulti = sourceFileType === 'multi' || sourceFileContent?.includes('--- SOURCE:');
        if (isMulti) return 'multi';
        return 'single';
    }
    if (mode === 'multi' || mode === 'multi-source') return 'multi';
    if (mode === 'compare') return 'compare';
    return 'single';
}

function normalizeMapDepth(depth?: string, nodeCount?: number): string {
    if (!depth || depth === 'auto' || depth === 'unspecified') {
        if (!nodeCount) return 'low';
        return nodeCount > 75 ? 'deep' : nodeCount > 35 ? 'medium' : 'low';
    }
    if (depth === 'low' || depth === 'medium' || depth === 'deep') return depth;
    return 'low';
}

function normalizeSourceType(sourceFileType?: string, sourceType?: string, sourceUrl?: string, videoId?: string): string {
    const source = sourceFileType || sourceType;
    if (source === 'multi') return 'multi';
    if (source === 'pdf') return 'pdf';
    if (source === 'image') return 'image';
    if (source === 'youtube' || videoId) return 'youtube';
    if (source === 'website' || sourceUrl) return 'website';
    return 'text';
}

function normalizePersona(aiPersona?: string, persona?: string): string {
    const raw = (aiPersona || persona || '').toLowerCase().trim();
    if (raw === 'concise') return 'Concise';
    if (raw === 'creative') return 'Creative';
    if (raw.includes('sage')) return 'Sage';
    if (raw === 'teacher' || raw === 'standard' || !raw) return 'Teacher';
    return 'Teacher';
}

async function backfillUserStatistics() {
    console.log('🚀 Starting user statistics backfill...\n');

    // Initialize Firebase Admin
    if (!admin.apps.length) {
        let serviceAccount: any = null;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                console.log('📁 Loaded credentials from FIREBASE_SERVICE_ACCOUNT_JSON');
            } catch (e) {
                console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
                process.exit(1);
            }
        } else {
            const saPath = path.join(process.cwd(), 'service-account.json');
            if (fs.existsSync(saPath)) {
                const saContent = fs.readFileSync(saPath, 'utf8');
                serviceAccount = JSON.parse(saContent);
                console.log('📁 Loaded credentials from service-account.json');
            }
        }

        if (!serviceAccount) {
            console.error('❌ No Firebase credentials found');
            process.exit(1);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const firestore = admin.firestore();

    // Get all users
    const usersSnap = await firestore.collection('users').get();
    console.log(`📊 Found ${usersSnap.size} users to process\n`);

    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        processedCount++;

        try {
            // Get all maps for this user
            const mapsSnap = await firestore
                .collection('users')
                .doc(userId)
                .collection('mindmaps')
                .get();

            // Initialize counters
            const stats: UserStatistics = {
                modeCounts: { single: 0, compare: 0, multi: 0 },
                depthCounts: { low: 0, medium: 0, deep: 0 },
                sourceCounts: { text: 0, website: 0, youtube: 0, pdf: 0, image: 0, multi: 0 },
                personaCounts: { Teacher: 0, Concise: 0, Creative: 0, Sage: 0 },
                version: 2,
                isBackfilledPartial: true, // Mark as partial since we only have current maps
            };

            // Process each map
            for (const mapDoc of mapsSnap.docs) {
                const mapData = mapDoc.data() as MapData;

                const mode = normalizeMapMode(mapData.mode, mapData.sourceFileType);
                const depth = normalizeMapDepth(mapData.depth, mapData.nodeCount);
                const source = normalizeSourceType(
                    mapData.sourceFileType, 
                    mapData.sourceType, 
                    mapData.sourceUrl, 
                    mapData.videoId
                );
                const persona = normalizePersona(mapData.aiPersona, mapData.aiPersona);

                stats.modeCounts[mode] = (stats.modeCounts[mode] || 0) + 1;
                stats.depthCounts[depth] = (stats.depthCounts[depth] || 0) + 1;
                stats.sourceCounts[source] = (stats.sourceCounts[source] || 0) + 1;
                stats.personaCounts[persona] = (stats.personaCounts[persona] || 0) + 1;
            }

            // Update user document
            await userDoc.ref.update({
                'statistics.modeCounts': stats.modeCounts,
                'statistics.depthCounts': stats.depthCounts,
                'statistics.sourceCounts': stats.sourceCounts,
                'statistics.personaCounts': stats.personaCounts,
                'statistics.version': stats.version,
                'statistics.isBackfilledPartial': stats.isBackfilledPartial,
                'statistics.lastBackfilledAt': admin.firestore.FieldValue.serverTimestamp(),
            });

            updatedCount++;
            console.log(`✅ [${processedCount}/${usersSnap.size}] ${userId}: ${mapsSnap.size} maps processed`);

        } catch (error: any) {
            errorCount++;
            console.error(`❌ [${processedCount}/${usersSnap.size}] ${userId}: ${error.message}`);
        }

        // Add delay to avoid overwhelming Firestore
        if (processedCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Backfill Complete');
    console.log('='.repeat(50));
    console.log(`Total users: ${usersSnap.size}`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    if (errorCount > 0) {
        console.log('⚠️ Some users failed. Run again to retry failed users.');
    } else {
        console.log('🎉 All users processed successfully!');
    }

    process.exit(errorCount > 0 ? 1 : 0);
}

// Run if executed directly
backfillUserStatistics().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
