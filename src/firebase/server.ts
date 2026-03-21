import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Server-safe initialization for Firebase using the Admin SDK.
 * This provides full access to Firestore and other services without needing client-side auth.
 */
export function initializeFirebaseServer() {
    if (admin.apps.length === 0) {
        try {
            // First try to use environment variables for service account
            if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
                try {
                    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                    console.log("✅ Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON env var");
                    return { app: admin.app(), firestore: admin.firestore() };
                } catch (jsonErr) {
                    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", jsonErr);
                }
            }

            // Fallback: check for service-account.json file if not in production
            const saPath = path.join(process.cwd(), 'service-account.json');
            if (process.env.NODE_ENV !== 'production' && fs.existsSync(saPath)) {
                const saContent = fs.readFileSync(saPath, 'utf8');
                const serviceAccount = JSON.parse(saContent);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log("✅ Firebase Admin initialized with service account from:", saPath);
            } else {
                // Final fallback to default credentials
                admin.initializeApp();
                console.log("ℹ️ Firebase Admin initialized with default credentials");
            }
        } catch (e: any) {
            console.error("❌ Error initializing Firebase Admin:", e.message);
            // Last resort fallback
            if (admin.apps.length === 0) {
                try {
                    admin.initializeApp();
                } catch (innerError: any) {
                    console.error("❌ Critical: Failed to initialize Firebase Admin even with fallback:", innerError.message);
                }
            }
        }
    }

    return {
        app: admin.app(),
        firestore: admin.firestore(),
    };
}
