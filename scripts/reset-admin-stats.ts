/**
 * Fix script: Reset adminStats mapAnalytics to zeros
 * 
 * Usage: npx ts-node --esm scripts/reset-admin-stats.ts
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function resetAdminStats() {
  console.log('🔧 Resetting adminStats...\n');

  // Initialize Firebase Admin
  const existingApps = admin.apps;
  if (!existingApps || existingApps.length === 0) {
    let serviceAccount: any = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log('📁 Loaded credentials from FIREBASE_SERVICE_ACCOUNT_JSON');
      } catch (e: any) {
        console.error('❌ Failed to parse:', e.message);
        process.exit(1);
      }
    } else {
      const saPath = join(process.cwd(), 'service-account.json');
      if (existsSync(saPath)) {
        const saContent = readFileSync(saPath, 'utf8');
        serviceAccount = JSON.parse(saContent);
        console.log('📁 Loaded from service-account.json');
      }
    }

    if (!serviceAccount) {
      console.error('❌ No credentials found');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const firestore = admin.firestore();
  const statsRef = firestore.collection('adminStats').doc('all-time');

  const emptyMapAnalytics = {
    totalAnalyzed: 0,
    modeCounts: { single: 0, compare: 0, multi: 0 },
    depthCounts: { low: 0, medium: 0, deep: 0, unspecified: 0 },
    sourceCounts: {},
    personaCounts: {},
    subMapStats: { total: 0, parents: 0, avgPerParent: 0 },
    publicPrivate: { public: 0, private: 0 },
    avgNodesPerMap: 0,
    featuredCount: 0,
    topPersona: 'N/A',
    userStats: [],
  };

  try {
    await statsRef.set({
      totalUsers: 4,
      totalMindmaps: 0,
      totalMindmapsEver: 0,
      totalChats: 0,
      totalPublicMaps: 0,
      activeUsers24h: 0,
      healthScore: 0,
      engagementRate: 0,
      newUsersToday: 0,
      newUsersYesterday: 0,
      newMapsToday: 0,
      newMapsYesterday: 0,
      avgMapsPerUser: 0,
      avgChatsPerUser: 0,
      avgNodesPerMap: 0,
      heatmapDays: [],
      mapAnalytics: emptyMapAnalytics,
      latestUsers: [],
      latestMaps: [],
      topUsers: [],
      timestamp: null,
      lastUpdated: Date.now(),
    }, { merge: true });

    console.log('✅ adminStats reset successfully!');
    console.log('   mapAnalytics.totalAnalyzed: 0');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

resetAdminStats().catch(console.error);
