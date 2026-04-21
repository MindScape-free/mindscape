// Re-exports Supabase-backed implementations with the same API surface as the old Firestore Admin helpers
export type { UserImageSettings } from './supabase-server';
export { getUserImageSettingsAdmin, getMindMapAdmin } from './supabase-server';
