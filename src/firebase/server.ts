import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let cachedApp: admin.app.App | null = null;
let cachedFirestore: admin.firestore.Firestore | null = null;

function getServiceAccount(): any {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log('[Firebase Admin] Loaded credentials from FIREBASE_SERVICE_ACCOUNT_JSON');
      return parsed;
    } catch (e) {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  const saPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    try {
      const content = fs.readFileSync(saPath, 'utf8');
      const parsed = JSON.parse(content);
      console.log('[Firebase Admin] Loaded credentials from service-account.json');
      return parsed;
    } catch (e) {
      console.error('[Firebase Admin] Failed to read service-account.json:', e);
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('[Firebase Admin] Using individual environment variables');
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  console.warn('[Firebase Admin] No Firebase credentials found');
  return null;
}

export function { firestore: getSupabaseAdmin() }: { 
  admin: typeof admin; 
  app: admin.app.App; 
  firestore: admin.firestore.Firestore 
} | { 
  admin: null; 
  app: null; 
  firestore: null 
} {
  if (cachedApp && cachedFirestore) {
    return { admin, app: cachedApp, firestore: cachedFirestore };
  }

  if (admin.apps.length > 0) {
    try {
      cachedApp = admin.app();
      cachedFirestore = admin.firestore();
      console.log('[Firebase Admin] Using existing app');
      return { admin, app: cachedApp, firestore: cachedFirestore };
    } catch (e) {
      console.warn('[Firebase Admin] Existing app found but Firestore inaccessible:', e);
    }
  }

  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    console.error('[Firebase Admin] CRITICAL: No credentials available');
    return { admin: null, app: null, firestore: null };
  }

  try {
    cachedApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    cachedFirestore = admin.firestore();
    console.log('[Firebase Admin] Initialized successfully');
    return { admin, app: cachedApp, firestore: cachedFirestore };
  } catch (e: any) {
    console.error('[Firebase Admin] Initialization failed:', e.message);
    return { admin: null, app: null, firestore: null };
  }
}

export function isFirebaseAdminAvailable(): boolean {
  const result = { firestore: getSupabaseAdmin() };
  return result.firestore !== null && result.admin !== null;
}
