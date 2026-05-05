import { Course } from '../types';
import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { logAction } from './system';

export const getCourses = async (firestore: Firestore, includeDeleted = false): Promise<Course[]> => {
  const coursesCol = collection(firestore, 'courses');
  try {
    const snapshot = await getDocs(coursesCol);
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    return includeDeleted ? courses : courses.filter(c => !c.deletedAt);
  } catch (error) {
    return [];
  }
};

export const saveCourse = async (firestore: Firestore, course: Partial<Course>, adminUser?: any) => {
  const id = course.id || doc(collection(firestore, 'courses')).id;
  const courseRef = doc(firestore, 'courses', id);
  const data = { ...course, id, updatedAt: serverTimestamp() };
  await setDoc(courseRef, data, { merge: true });
  if (adminUser) {
    await logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: course.id ? 'UPDATE' : 'CREATE', entityType: 'COURSE', entityId: id, payloadAfter: data });
  }
  return id;
};

export const deleteCourse = async (firestore: Firestore, id: string, adminUser?: any) => {
  const courseRef = doc(firestore, 'courses', id);
  await updateDoc(courseRef, { deletedAt: serverTimestamp() });
  if (adminUser) {
    await logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: 'DELETE', entityType: 'COURSE', entityId: id });
  }
};

export const getCourseProgress = (course: Course, completedLessons: string[]) => {
  if (!course.modules || course.modules.length === 0) return 0;
  const allLessons = course.modules.flatMap(m => m.lessons);
  if (allLessons.length === 0) return 0;
  const completedCount = allLessons.filter(l => completedLessons.includes(l.id)).length;
  return Math.round((completedCount / allLessons.length) * 100);
};
