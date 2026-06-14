export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '03504efc-d50a-4e84-ba24-1d82ef41fd82').split(',').map(s => s.trim());
  return adminIds.includes(userId);
}
