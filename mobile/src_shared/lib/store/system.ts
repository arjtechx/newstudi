import { SystemSettings, SoundSettings, DashboardWidgetConfig, SystemLog } from '../types';
import { collection, doc, getDocs, getDoc, setDoc, query, orderBy, limit, serverTimestamp, Firestore } from 'firebase/firestore';

export const logAction = async (firestore: Firestore, log: Omit<SystemLog, 'id' | 'timestamp'>) => {
  const logRef = doc(collection(firestore, 'system_logs'));
  const safeLog = JSON.parse(JSON.stringify(log));
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
  const safeSettings = JSON.parse(JSON.stringify(settings));

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
