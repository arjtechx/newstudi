import { doc, updateDoc, deleteDoc, deleteField, Firestore } from 'firebase/firestore';

export const restoreQuestion = (f: Firestore, id: string) => updateDoc(doc(f, 'questions', id), { deletedAt: deleteField() });
export const permanentlyDeleteQuestion = (f: Firestore, id: string) => deleteDoc(doc(f, 'questions', id));
export const restoreCourse = (f: Firestore, id: string) => updateDoc(doc(f, 'courses', id), { deletedAt: deleteField() });
export const permanentlyDeleteCourse = (f: Firestore, id: string) => deleteDoc(doc(f, 'courses', id));
export const restoreUser = (f: Firestore, id: string) => updateDoc(doc(f, 'users', id), { deletedAt: deleteField() });
export const permanentlyDeleteUser = (f: Firestore, id: string) => deleteDoc(doc(f, 'users', id));
export const restoreSubject = (f: Firestore, id: string) => updateDoc(doc(f, 'subjects', id), { deletedAt: deleteField() });
export const permanentlyDeleteSubject = (f: Firestore, id: string) => deleteDoc(doc(f, 'subjects', id));
