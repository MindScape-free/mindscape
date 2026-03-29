import { doc, getDoc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

const ADMIN_COLLECTION = 'admins';

export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const app = getApps()[0];
    if (!app) return false;
    
    const firestore = getFirestore(app);
    const adminDoc = await getDoc(doc(firestore, ADMIN_COLLECTION, userId));
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function addAdmin(userId: string, adminData: {
  addedBy?: string;
  addedAt?: Date;
  role?: string;
  email?: string;
  displayName?: string;
}): Promise<boolean> {
  try {
    const app = getApps()[0];
    if (!app) return false;
    
    const firestore = getFirestore(app);
    await setDoc(doc(firestore, ADMIN_COLLECTION, userId), {
      ...adminData,
      addedAt: adminData.addedAt || new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error adding admin:', error);
    return false;
  }
}

export async function removeAdmin(userId: string): Promise<boolean> {
  try {
    const app = getApps()[0];
    if (!app) return false;
    
    const firestore = getFirestore(app);
    await deleteDoc(doc(firestore, ADMIN_COLLECTION, userId));
    return true;
  } catch (error) {
    console.error('Error removing admin:', error);
    return false;
  }
}

export async function getAdminList(): Promise<string[]> {
  try {
    const app = getApps()[0];
    if (!app) return [];
    
    const firestore = getFirestore(app);
    const { getDocs } = await import('firebase/firestore');
    const snapshot = await getDocs(collection(firestore, ADMIN_COLLECTION));
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error getting admin list:', error);
    return [];
  }
}
