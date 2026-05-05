import { Question } from '../types';
import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { logAction } from './system';

export const getQuestions = async (firestore: Firestore, includeDeleted = false): Promise<Question[]> => {
  const qCollection = collection(firestore, 'questions');
  try {
    const snapshot = await getDocs(qCollection);
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
    return includeDeleted ? questions : questions.filter(q => !q.deletedAt);
  } catch (error) {
    return [];
  }
};

export const saveQuestion = (firestore: Firestore, question: Partial<Question>, adminUser?: any) => {
  const id = question.id || doc(collection(firestore, 'questions')).id;
  const questionRef = doc(firestore, 'questions', id);
  const data = { ...question, id, updatedAt: serverTimestamp() };
  setDoc(questionRef, data, { merge: true });
  if (adminUser) logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: question.id ? 'UPDATE' : 'CREATE', entityType: 'QUESTION', entityId: id, payloadAfter: data });
};

export const deleteQuestion = (firestore: Firestore, id: string, adminUser?: any) => {
  const questionRef = doc(firestore, 'questions', id);
  updateDoc(questionRef, { deletedAt: serverTimestamp() });
  if (adminUser) logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: 'DELETE', entityType: 'QUESTION', entityId: id });
};
