/**
 * FULL DATABASE RESET - DELETE ALL DATA
 * 
 * WARNING: This will permanently delete ALL data from Firestore!
 * 
 * Usage: 
 *   npm run db:reset          (with service-account.json)
 *   npm run db:reset:env      (with FIREBASE_SERVICE_ACCOUNT_JSON)
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const COLLECTIONS_TO_WIPE = [
  // User data
  'users',
  
  // Mindmap collections
  'mindMaps',           // legacy
  'publicMindmaps',
  'sharedMindmaps',
  
  // Admin/analytics
  'adminStats',
  'adminCache',
  'adminActivityLog',
  'monthlyStats',
  
  // User content (subcollections - handled separately)
  // 'users/{uid}/mindmaps'
  // 'users/{uid}/chatSessions'
  
  // Feedback
  'feedback',
  
  // Other
  'rateLimits',
];

async function initializeFirebase() {
  const existingApps = admin.apps;
  if (existingApps.length > 0) {
    return admin.firestore();
  }

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
    if (existsSync(saPath)) {
      const saContent = readFileSync(saPath, 'utf8');
      serviceAccount = JSON.parse(saContent);
      console.log('📁 Loaded from service-account.json');
    }
  }

  if (!serviceAccount) {
    console.error('❌ No Firebase credentials found');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin initialized');
  return admin.firestore();
}

async function deleteCollection(db: FirebaseFirestore.Firestore, collectionPath: string, batchSize: number = 100): Promise<number> {
  const collectionRef = db.collection(collectionPath);
  
  return new Promise((resolve, reject) => {
    let deletedCount = 0;
    
    function deleteBatch() {
      collectionRef
        .limit(batchSize)
        .get()
        .then((snapshot) => {
          if (snapshot.empty) {
            resolve(deletedCount);
            return;
          }

          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          return batch.commit().then(() => {
            deletedCount += snapshot.size;
            if (deletedCount % 500 === 0) {
              console.log(`   📊 ${collectionPath}: Deleted ${deletedCount} documents...`);
            }
            // Continue deleting
            return deleteBatch();
          });
        })
        .catch(reject);
    }

    deleteBatch();
  });
}

async function deleteSubcollection(
  db: FirebaseFirestore.Firestore, 
  parentCollection: string, 
  subcollectionName: string, 
  batchSize: number = 100
): Promise<number> {
  console.log(`\n🔍 Scanning for ${parentCollection}/{userId}/${subcollectionName}...`);
  
  const parentRef = db.collectionGroup(subcollectionName);
  
  return new Promise((resolve, reject) => {
    let deletedCount = 0;
    
    function deleteBatch() {
      parentRef
        .limit(batchSize)
        .get()
        .then((snapshot) => {
          if (snapshot.empty) {
            resolve(deletedCount);
            return;
          }

          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          return batch.commit().then(() => {
            deletedCount += snapshot.size;
            if (deletedCount % 500 === 0) {
              console.log(`   📊 Deleted ${deletedCount} ${subcollectionName} documents...`);
            }
            return deleteBatch();
          });
        })
        .catch(reject);
    }

    deleteBatch();
  });
}

async function resetAdminStats(db: FirebaseFirestore.Firestore) {
  console.log('\n📊 Resetting adminStats to zeros...');
  
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

  await db.collection('adminStats').doc('all-time').set({
    totalUsers: 0,
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

  console.log('✅ adminStats reset complete');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚨 FULL DATABASE RESET - DELETING ALL DATA');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n⚠️  This operation is IRREVERSIBLE!\n');

  const db = await initializeFirebase();

  // Delete top-level collections
  console.log('\n📁 Deleting top-level collections...');
  for (const collection of COLLECTIONS_TO_WIPE) {
    try {
      const count = await deleteCollection(db, collection);
      console.log(`   ✅ ${collection}: Deleted ${count} documents`);
    } catch (error: any) {
      console.log(`   ⚠️  ${collection}: ${error.message}`);
    }
  }

  // Delete subcollections (mindmaps under users)
  console.log('\n📁 Deleting user subcollections...');
  
  try {
    const mindmapsCount = await deleteSubcollection(db, 'users', 'mindmaps');
    console.log(`   ✅ users/{uid}/mindmaps: Deleted ${mindmapsCount} documents`);
  } catch (error: any) {
    console.log(`   ⚠️  mindmaps subcollection: ${error.message}`);
  }

  try {
    const chatsCount = await deleteSubcollection(db, 'users', 'chatSessions');
    console.log(`   ✅ users/{uid}/chatSessions: Deleted ${chatsCount} documents`);
  } catch (error: any) {
    console.log(`   ⚠️  chatSessions subcollection: ${error.message}`);
  }

  try {
    const sharedCount = await deleteSubcollection(db, 'users', 'sharedMindmaps');
    console.log(`   ✅ users/{uid}/sharedMindmaps: Deleted ${sharedCount} documents`);
  } catch (error: any) {
    console.log(`   ⚠️  sharedMindmaps subcollection: ${error.message}`);
  }

  // Reset admin stats
  await resetAdminStats(db);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ DATABASE RESET COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n📋 Summary:');
  console.log('   - All users deleted');
  console.log('   - All mindmaps deleted');
  console.log('   - All chat sessions deleted');
  console.log('   - All feedback deleted');
  console.log('   - All admin/analytics data deleted');
  console.log('   - adminStats reset to zeros');
  console.log('\n💡 New users/mindmaps will start fresh.\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
