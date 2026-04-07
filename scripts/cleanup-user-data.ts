/**
 * Data Cleanup Script: Delete all user data except user documents themselves
 * 
 * This script deletes:
 * - All mindmaps (and their sub-collections)
 * - All chat sessions
 * - Activity logs
 * - User statistics
 * - Feedback
 * 
 * PRESERVES:
 * - User authentication records (the user documents themselves)
 * 
 * Usage:
 *   npx ts-node --esm scripts/cleanup-user-data.ts
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CleanupResult {
  usersProcessed: number;
  mindmapsDeleted: number;
  chatsDeleted: number;
  feedbackDeleted: number;
  activityDeleted: number;
  errors: string[];
}

async function cleanupUserData(): Promise<CleanupResult> {
  console.log('🗑️ Starting user data cleanup...\n');
  console.log('⚠️  WARNING: This will delete ALL user data except user documents!\n');

  // Initialize Firebase Admin
  const existingApps = admin.apps;
  if (!existingApps || existingApps.length === 0) {
    let serviceAccount: any = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log('📁 Loaded credentials from FIREBASE_SERVICE_ACCOUNT_JSON');
      } catch (e: any) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
        process.exit(1);
      }
    } else {
      const saPath = join(process.cwd(), 'service-account.json');
      console.log('🔍 Checking for service account at:', saPath);
      if (existsSync(saPath)) {
        try {
          const saContent = readFileSync(saPath, 'utf8');
          serviceAccount = JSON.parse(saContent);
          console.log('📁 Loaded credentials from service-account.json');
        } catch (e: any) {
          console.error('❌ Failed to read/parse service-account.json:', e.message);
          process.exit(1);
        }
      }
    }

    if (!serviceAccount) {
      console.error('❌ No Firebase credentials found');
      console.error('   Please either:');
      console.error('   1. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
      console.error('   2. Create service-account.json in project root');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    console.log('✅ Using existing Firebase Admin instance');
  }

  const firestore = admin.firestore();
  const result: CleanupResult = {
    usersProcessed: 0,
    mindmapsDeleted: 0,
    chatsDeleted: 0,
    feedbackDeleted: 0,
    activityDeleted: 0,
    errors: []
  };

  // Get all users
  const usersSnap = await firestore.collection('users').get();
  console.log(`📊 Found ${usersSnap.size} users\n`);

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    result.usersProcessed++;
    console.log(`\n🔄 Processing user: ${userId} (${result.usersProcessed}/${usersSnap.size})`);

    try {
      // 1. Delete mindmaps collection (with sub-collections)
      const mindmapsSnap = await firestore
        .collection('users')
        .doc(userId)
        .collection('mindmaps')
        .get();
      
      console.log(`   📚 Found ${mindmapsSnap.size} mindmaps to delete`);
      
      for (const mapDoc of mindmapsSnap.docs) {
        // Delete the map document and all its sub-collections
        const subCollections = await mapDoc.ref.listCollections();
        
        for (const subCol of subCollections) {
          const subDocs = await subCol.get();
          for (const subDoc of subDocs.docs) {
            await subDoc.ref.delete();
          }
        }
        
        await mapDoc.ref.delete();
        result.mindmapsDeleted++;
      }

      // 2. Delete chatSessions collection
      const chatsSnap = await firestore
        .collection('users')
        .doc(userId)
        .collection('chatSessions')
        .get();
      
      console.log(`   💬 Found ${chatsSnap.size} chat sessions to delete`);
      
      for (const chatDoc of chatsSnap.docs) {
        await chatDoc.ref.delete();
        result.chatsDeleted++;
      }

      // 3. Reset user statistics to defaults
      await userDoc.ref.update({
        'statistics': {
          totalMapsCreated: 0,
          totalNodes: 0,
          totalImagesGenerated: 0,
          totalChats: 0,
          totalNestedExpansions: 0,
          totalStudyTimeMinutes: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          modeCounts: { single: 0, compare: 0, multi: 0 },
          depthCounts: { low: 0, medium: 0, deep: 0 },
          sourceCounts: { text: 0, website: 0, youtube: 0, pdf: 0, image: 0, multi: 0 },
          personaCounts: { Teacher: 0, Concise: 0, Creative: 0, Sage: 0 },
          version: 2,
        },
        'activity': admin.firestore.FieldValue.delete(),
        'unlockedAchievements': admin.firestore.FieldValue.delete(),
      });
      console.log(`   ✅ Reset statistics`);

      // 4. Reset user document fields
      await userDoc.ref.update({
        'preferences': admin.firestore.FieldValue.delete(),
        'onboardingCompleted': false,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Reset user preferences`);

      console.log(`   ✅ User data cleaned successfully`);

    } catch (error: any) {
      result.errors.push(`${userId}: ${error.message}`);
      console.error(`   ❌ Error: ${error.message}`);
    }

    // Delay to avoid overwhelming Firestore
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 5. Delete all admin activity logs
  console.log('\n🗑️ Cleaning up admin activity logs...');
  try {
    const activitySnap = await firestore.collection('adminActivityLog').get();
    for (const doc of activitySnap.docs) {
      await doc.ref.delete();
      result.activityDeleted++;
    }
  } catch (error: any) {
    result.errors.push(`Activity logs: ${error.message}`);
  }

  // 6. Delete all feedback
  console.log('🗑️ Cleaning up feedback...');
  try {
    const feedbackSnap = await firestore.collection('feedback').get();
    for (const doc of feedbackSnap.docs) {
      await doc.ref.delete();
      result.feedbackDeleted++;
    }
  } catch (error: any) {
    result.errors.push(`Feedback: ${error.message}`);
  }

  // 7. Reset admin stats
  console.log('🗑️ Resetting admin stats...');
  try {
    await firestore.collection('adminStats').doc('all-time').set({
      totalUsers: usersSnap.size,
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
      mapAnalytics: {
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
      },
      latestUsers: [],
      latestMaps: [],
      topUsers: [],
      timestamp: null,
      lastUpdated: Date.now(),
    });
  } catch (error: any) {
    result.errors.push(`Admin stats: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 CLEANUP COMPLETE');
  console.log('='.repeat(50));
  console.log(`Users processed: ${result.usersProcessed}`);
  console.log(`Mindmaps deleted: ${result.mindmapsDeleted}`);
  console.log(`Chat sessions deleted: ${result.chatsDeleted}`);
  console.log(`Activity logs deleted: ${result.activityDeleted}`);
  console.log(`Feedback deleted: ${result.feedbackDeleted}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log('='.repeat(50));

  if (result.errors.length > 0) {
    console.log('\n⚠️ Errors encountered:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ User authentication records preserved!');
  console.log('📝 Users can still log in with existing credentials.\n');

  process.exit(result.errors.length > 0 ? 1 : 0);
}

// Run if executed directly
cleanupUserData().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
