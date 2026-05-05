
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
  const safeLog = JSON.parse(JSON.stringify(log)); // Remove campos undefined
  await setDoc(logRef, { ...safeLog, id: logRef.id, timestamp: serverTimestamp() });
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

export const saveSystemSettings = async (firestore: Firestore, settings: Partial<SystemSettings>, adminUser?: any) => {
  const settingsRef = doc(firestore, 'settings', 'main');
  const safeSettings = JSON.parse(JSON.stringify(settings)); // Evitar o erro do Firebase com undefined

  await setDoc(settingsRef, safeSettings, { merge: true });
  if (adminUser) {
    await logAction(firestore, {
      userId: adminUser.id || 'unknown',
      userName: adminUser.name || 'Admin',
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: 'main',
      payloadAfter: safeSettings
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

export const deleteCourse = (firestore: Firestore, id: string, adminUser?: any) => {
  const courseRef = doc(firestore, 'courses', id);
  updateDoc(courseRef, { deletedAt: serverTimestamp() });
  if (adminUser) logAction(firestore, { userId: adminUser.id, userName: adminUser.name, action: 'DELETE', entityType: 'COURSE', entityId: id });
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

  // Analisador de Fraquezas: Agrupar erros por tópico
  const errorMap: Record<string, { count: number, recentErrorId: string, timestamp: number }> = {};
  history.filter((h: any) => !h.isCorrect).forEach((h: any) => {
    const topicName = h.topic || h.subject || 'Geral';
    const ts = h.timestamp?.toMillis ? h.timestamp.toMillis() : 0;
    
    if (!errorMap[topicName]) {
      errorMap[topicName] = { count: 0, recentErrorId: h.questionId, timestamp: ts };
    }
    
    errorMap[topicName].count += 1;
    if (ts >= errorMap[topicName].timestamp) {
      errorMap[topicName].recentErrorId = h.questionId;
      errorMap[topicName].timestamp = ts;
    }
  });

  // Transforma o mapa em array e ordena pelos maiores erros
  const topErrosData = Object.entries(errorMap)
    .map(([topic, data]) => ({ topic, errorCount: data.count, recentErrorId: data.recentErrorId }))
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 3); // Pega os 3 principais

  // Buscar os detalhes das questões erradas
  const topErros = await Promise.all(topErrosData.map(async (err) => {
    if (!err.recentErrorId) return err;
    try {
      const qSnap = await getDoc(doc(firestore, 'questions', err.recentErrorId));
      if (qSnap.exists()) {
        const qData = qSnap.data();
        return {
          ...err,
          enunciado: qData.enunciado,
          explicacao: qData.explicacao,
          correta: qData.alternativas[qData.correta]
        };
      }
    } catch (e) {}
    return err;
  }));

  // Progresso Mental: Precisão por Matéria
  const subjectMap: Record<string, { total: number, correct: number }> = {};
  history.forEach((h: any) => {
    const subj = h.subject || 'Geral';
    if (!subjectMap[subj]) subjectMap[subj] = { total: 0, correct: 0 };
    subjectMap[subj].total += 1;
    if (h.isCorrect) subjectMap[subj].correct += 1;
  });

  const subjectStats = Object.entries(subjectMap).map(([subject, data]) => ({
    subject: subject.length > 12 ? subject.substring(0, 12) + '...' : subject,
    accuracy: Math.round((data.correct / data.total) * 100),
    fullMark: 100
  }));

  const coursesProgressList = courses.map(course => {
    const completed = getCourseProgress(course, u.completedLessons || []);
    return { title: course.title, percentage: completed };
  }).filter(c => c.percentage > 0).sort((a, b) => b.percentage - a.percentage);

  // Se não houver curso iniciado, mostra os existentes zerados (até 3)
  const displayCourses = coursesProgressList.length > 0 ? coursesProgressList : courses.slice(0,3).map(c => ({ title: c.title, percentage: 0 }));

  return {
    taxaAcerto: acc,
    totalQuestoes: total,
    totalAcertos: correct,
    risco: acc < 50 ? 'ALTO' : 'BAIXO',
    topErros,
    revisaoDoDia: [],
    proximaMissao: { titulo: 'Continuar Estudos', descricao: 'Continue sua trilha tática.' },
    sessaoSugerida: { materias: [] },
    simulado: { notaAtual: acc / 10, notaCorte: 7.0 },
    consistencia: { nivel: 'Ideal', status: 'OK' },
    alertasCognitivos: [],
    subjectStats,
    coursesProgress: displayCourses
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
