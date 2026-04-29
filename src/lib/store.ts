
import { Question, Subject, SubjectProgress, UserPerformance, Course, UserProfile, SystemSettings, SoundSettings, DashboardWidgetConfig, SystemLog, AppNotification } from './types';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  writeBatch,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Firestore,
  serverTimestamp,
  Timestamp,
  deleteField,
  orderBy,
  limit,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { differenceInDays, startOfDay } from 'date-fns';

// --- System Logs (Versionamento) ---
export const logAction = async (firestore: Firestore, log: Omit<SystemLog, 'id' | 'timestamp'>) => {
  const logRef = doc(collection(firestore, 'system_logs'));
  setDoc(logRef, { ...log, id: logRef.id, timestamp: serverTimestamp() });
};

export const getSystemLogs = async (firestore: Firestore, limitCount = 50): Promise<SystemLog[]> => {
  const logsCol = collection(firestore, 'system_logs');
  const q = query(logsCol, orderBy('timestamp', 'desc'), limit(limitCount));
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as SystemLog));
  } catch (e) {
    return [];
  }
};

// --- System Settings ---
const DEFAULT_SOUNDS: SoundSettings = {
  success: 'https://actions.google.com/sounds/v1/events/positive_feedback.ogg',
  error: 'https://actions.google.com/sounds/v1/events/negative_feedback.ogg',
  tick: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  timeout: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
  fanfare: 'https://actions.google.com/sounds/v1/events/victory_music.ogg'
};

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'kpis', label: 'Indicadores (KPIs)', enabled: true, order: 0 },
  { id: 'broadcast_alerts', label: 'Avisos da Coordenação', enabled: true, order: 1 },
  { id: 'active_courses', label: 'Cursos em Andamento', enabled: true, order: 2 },
  { id: 'errors', label: 'Supressão de Erros', enabled: true, order: 3 },
  { id: 'revision', label: 'Repetição Espaçada', enabled: true, order: 4 },
  { id: 'session', label: 'Sessão Tática', enabled: true, order: 5 },
  { id: 'performance', label: 'Performance por Área', enabled: true, order: 6 },
  { id: 'simulado', label: 'Projeção de Simulado', enabled: true, order: 7 },
];

const DEFAULT_SETTINGS: SystemSettings = {
  id: 'main',
  sounds: DEFAULT_SOUNDS,
  animations: { enabled: true },
  dashboard: { widgets: DEFAULT_WIDGETS },
  maintenanceMode: { enabled: false, restrictedModules: [], message: "O sistema está em manutenção tática." }
};

export const getSystemSettings = async (firestore: Firestore): Promise<SystemSettings> => {
  const settingsRef = doc(firestore, 'settings', 'main');
  try {
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      return { ...DEFAULT_SETTINGS, ...data };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSystemSettings = (firestore: Firestore, settings: Partial<SystemSettings>, adminUser?: any) => {
  const settingsRef = doc(firestore, 'settings', 'main');
  setDoc(settingsRef, settings, { merge: true });
  if (adminUser) {
    logAction(firestore, {
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: 'main',
      payloadAfter: settings
    });
  }
};

// --- Notificações ---
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

// --- Usuários ---
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

// --- Questões ---
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

// --- Cursos ---
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

export const saveCourse = (firestore: Firestore, course: Partial<Course>, adminUser?: any) => {
  const id = course.id || doc(collection(firestore, 'courses')).id;
  const courseRef = doc(firestore, 'courses', id);
  const data = { ...course, id, updatedAt: serverTimestamp() };
  setDoc(courseRef, data, { merge: true });
  if (adminUser) logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: course.id ? 'UPDATE' : 'CREATE', entityType: 'COURSE', entityId: id, payloadAfter: data });
};

// --- Performance e Dashboard ---
export const getHistory = async (firestore: Firestore, userId: string) => {
  const historyCol = collection(firestore, `users/${userId}/history`);
  const snap = await getDocs(historyCol);
  return snap.docs.map(doc => doc.data());
};

export const updatePerformance = async (firestore: Firestore, userId: string, answer: any) => {
  const historyCol = collection(firestore, `users/${userId}/history`);
  const userRef = doc(firestore, 'users', userId);
  await setDoc(doc(historyCol), { ...answer, timestamp: serverTimestamp() });
  
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const u = userSnap.data();
    const xpGain = answer.isCorrect ? 50 : 10;
    updateDoc(userRef, { xp: (u.xp || 0) + xpGain, level: Math.floor(((u.xp || 0) + xpGain) / 1000) + 1 });
  }
};

export const getScientificDashboardData = async (firestore: Firestore, userId: string): Promise<any> => {
  const [history, courses] = await Promise.all([getHistory(firestore, userId), getCourses(firestore)]);
  const userRef = doc(firestore, 'users', userId);
  const userSnap = await getDoc(userRef);
  const u = userSnap.data() as UserProfile;
  
  const total = history.length;
  const correct = history.filter((h: any) => h.isCorrect).length;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    taxaAcerto: acc,
    totalQuestoes: total,
    totalAcertos: correct,
    risco: acc < 50 ? 'ALTO' : 'BAIXO',
    topErros: [],
    revisaoDoDia: [],
    proximaMissao: { titulo: 'Continuar Estudos', descricao: 'Continue sua trilha tática.' },
    sessaoSugerida: { materias: [] },
    simulado: { notaAtual: acc / 10, notaCorte: 7.0 },
    consistencia: { nivel: 'Ideal', status: 'OK' },
    alertasCognitivos: [],
    subjectStats: [],
    coursesProgress: []
  };
};

export const getSubjects = async (firestore: Firestore, includeDeleted = false) => {
  const snap = await getDocs(collection(firestore, 'subjects'));
  const subjects = snap.docs.map(d => ({ ...d.data(), id: d.id } as Subject));
  return includeDeleted ? subjects : subjects.filter(s => !s.deletedAt);
};

export const getProgress = async (firestore: Firestore, userId: string) => {
  const ref = doc(firestore, `users/${userId}/progress/main`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().subjects : [];
};

export const saveProgress = async (firestore: Firestore, userId: string, subjects: SubjectProgress[]) => {
  const progressRef = doc(firestore, 'users', userId, 'progress', 'main');
  await setDoc(progressRef, { subjects }, { merge: true });
};

export const getWeakestSubject = async (firestore: Firestore, userId: string) => {
  return { subject: 'GCM MARICÁ', topic: 'Legislação' };
};

export const getNote = async (firestore: Firestore, userId: string, lessonId: string) => {
  const ref = doc(firestore, `users/${userId}/notes/${lessonId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().content : "";
};

export const saveNote = async (firestore: Firestore, userId: string, lessonId: string, content: string) => {
  const ref = doc(firestore, `users/${userId}/notes/${lessonId}`);
  await setDoc(ref, { content, updatedAt: serverTimestamp() }, { merge: true });
};

export const completeLesson = async (firestore: Firestore, userId: string, lessonId: string) => {
  const userRef = doc(firestore, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    const completed = data.completedLessons || [];
    if (!completed.includes(lessonId)) {
      await updateDoc(userRef, {
        completedLessons: [...completed, lessonId],
        xp: (data.xp || 0) + 25
      });
    }
  }
};

export const getCourseProgress = (course: Course, completedLessons: string[]) => {
  if (!course.modules || course.modules.length === 0) return 0;
  const allLessons = course.modules.flatMap(m => m.lessons);
  if (allLessons.length === 0) return 0;
  const completedCount = allLessons.filter(l => completedLessons.includes(l.id)).length;
  return Math.round((completedCount / allLessons.length) * 100);
};

// --- Lixeira ---
export const restoreQuestion = (f: Firestore, id: string) => updateDoc(doc(f, 'questions', id), { deletedAt: deleteField() });
export const permanentlyDeleteQuestion = (f: Firestore, id: string) => deleteDoc(doc(f, 'questions', id));
export const restoreCourse = (f: Firestore, id: string) => updateDoc(doc(f, 'courses', id), { deletedAt: deleteField() });
export const permanentlyDeleteCourse = (f: Firestore, id: string) => deleteDoc(doc(f, 'courses', id));
export const restoreUser = (f: Firestore, id: string) => updateDoc(doc(f, 'users', id), { deletedAt: deleteField() });
export const permanentlyDeleteUser = (f: Firestore, id: string) => deleteDoc(doc(f, 'users', id));
export const restoreSubject = (f: Firestore, id: string) => updateDoc(doc(f, 'subjects', id), { deletedAt: deleteField() });
export const permanentlyDeleteSubject = (f: Firestore, id: string) => deleteDoc(doc(f, 'subjects', id));
