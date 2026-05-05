import { UserProfile } from '../types';
import { collection, doc, getDocs, setDoc, writeBatch, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { logAction } from './system';

export const getUsers = async (firestore: Firestore, includeDeleted = false): Promise<UserProfile[]> => {
  const usersCol = collection(firestore, 'users');
  try {
    const userSnapshot = await getDocs(usersCol);
    const users = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    return includeDeleted ? users : users.filter(user => !user.deletedAt);
  } catch (error) {
    return [];
  }
};

export const saveUser = async (firestore: Firestore, user: Partial<UserProfile>, adminUser?: any) => {
  if (!user.id) return;
  const userRef = doc(firestore, 'users', user.id);
  const adminRoleRef = doc(firestore, 'roles_admin', user.id);
  const batch = writeBatch(firestore);

  batch.set(userRef, { ...user, updatedAt: serverTimestamp() }, { merge: true });

  if (user.role) {
    if (user.role === 'admin') batch.set(adminRoleRef, { uid: user.id, assignedAt: Date.now() });
    else batch.delete(adminRoleRef);
  }

  await batch.commit();
  if (adminUser) {
    logAction(firestore, {
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'UPDATE',
      entityType: 'USER',
      entityId: user.id,
      payloadAfter: user
    });
  }
};

export const deleteUser = (firestore: Firestore, id: string, adminUser?: any) => {
  const userRef = doc(firestore, 'users', id);
  updateDoc(userRef, { deletedAt: serverTimestamp() });
  if (adminUser) logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: 'DELETE', entityType: 'USER', entityId: id });
};
