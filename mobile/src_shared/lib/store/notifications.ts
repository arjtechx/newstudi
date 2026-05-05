import { AppNotification } from '../types';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, Firestore } from 'firebase/firestore';
import { logAction } from './system';

export const getNotifications = async (firestore: Firestore, activeOnly = false): Promise<AppNotification[]> => {
  const col = collection(firestore, 'notifications');
  const q = activeOnly ? query(col, where('active', '==', true), orderBy('createdAt', 'desc')) : query(col, orderBy('createdAt', 'desc'));
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
  } catch (e) {
    return [];
  }
};

export const saveNotification = async (firestore: Firestore, notification: Partial<AppNotification>, adminUser?: any) => {
  const id = notification.id || doc(collection(firestore, 'notifications')).id;
  const data = { ...notification, id, createdAt: notification.createdAt || Date.now() };
  await setDoc(doc(firestore, 'notifications', id), data, { merge: true });
  if (adminUser) {
    logAction(firestore, {
      userId: adminUser.id,
      userName: adminUser.name,
      action: notification.id ? 'UPDATE' : 'CREATE',
      entityType: 'NOTIFICATION',
      entityId: id,
      payloadAfter: data
    });
  }
};

export const deleteNotification = async (firestore: Firestore, id: string, adminUser?: any) => {
  await deleteDoc(doc(firestore, 'notifications', id));
  if (adminUser) logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: 'DELETE', entityType: 'NOTIFICATION', entityId: id });
};
