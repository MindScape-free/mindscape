// Re-exports Supabase-backed implementations with the same API surface as the old Firestore helpers
export type { UserImageSettings } from './supabase-db';
export { getUserImageSettings, saveUserApiKey, deleteUserApiKey } from './supabase-db';
