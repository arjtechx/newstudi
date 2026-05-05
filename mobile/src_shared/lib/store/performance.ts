import { UserProfile, Course, Subject, SubjectProgress } from '../types';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { getCourses, getCourseProgress } from './courses';

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
