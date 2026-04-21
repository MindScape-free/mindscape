export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '').split(',').map(s => s.trim());
  return adminIds.includes(userId);
}
