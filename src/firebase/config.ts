export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates that essential environment variables are present in production.
 * Throws a specific error if keys are missing to prevent silent failures 
 * and trigger the Next.js error boundary with a identifiable signature.
 */
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  const missing = required.filter(key => {
    const val = process.env[key];
    return !val || val === 'undefined' || val === '';
  });
  
  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
         console.warn(`⚠️ Configuration Warning: Missing keys [${missing.join(', ')}]`);
    }
    
    // In production, we throw to trigger the error boundary rather than 
    // letting Firebase fail with obscure "permission denied" or "invalid-api-key"
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
       throw new Error(`MISSING_PROD_CONFIG: ${missing.join(', ')}`);
    }
  }
  
  return true;
};
