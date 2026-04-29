
export type Difficulty = 'Fácil' | 'Médio' | 'Difícil' | 'Hardcore';

export interface Question {
  id: string;
  materia: string;
  assunto: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  nivelDificuldade: Difficulty;
  banca?: string;
  ano?: number;
  tags: string[]; 
  xpCustom?: number;
  createdAt?: number;
  updatedAt?: any;
  deletedAt?: any;
}

export interface UserPerformance {
  history: {
    questionId: string;
    subject: string;
    topic: string;
    isCorrect: boolean;
    timestamp: any;
    difficulty?: Difficulty;
    xpEarned?: number;
  }[];
}

export interface Subject {
  id: string;
  name: string;
  createdAt?: number;
  updatedAt?: any;
  deletedAt?: any;
}

export interface SubjectProgress {
  id: string;
  name: string;
  topics: {
    id: string;
    name: string;
    studied: boolean;
    reviewed: boolean;
  }[];
}

export type UserRole = 'student' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  phone: string;
  photoUrl?: string;
  fcmToken?: string;
  twoFactorEnabled?: boolean;
  sessionStart?: number;
  createdAt?: number;
  updatedAt?: any;
  deletedAt?: any;
  xp: number;
  level: number;
  studyStreak: number;
  lastStudyDate: number;
  completedLessons: string[];
}

export type BlockType = 'h1' | 'p' | 'law' | 'example' | 'warning' | 'image' | 'tip' | 'video' | 'quiz' | 'math' | 'table' | 'audio' | 'slides';
export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
export type FontFamily = 'sans' | 'serif' | 'mono' | 'display';
export type TextColor = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

export interface ContentBlock {
  id: string;
  type: BlockType;
  value: string;
  metadata?: {
    alternatives?: string[];
    correct?: number;
    explanation?: string;
    url?: string;
    fontSize?: FontSize;
    fontWeight?: FontWeight;
    fontFamily?: FontFamily;
    textColor?: TextColor;
    headers?: string[];
    rows?: { cells: string[] }[];
  };
}

export interface Lesson {
  id: string;
  title: string;
  blocks: ContentBlock[];
  type: 'reading' | 'video' | 'quiz';
  estimatedTime: number;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export type CourseStatus = 'draft' | 'published';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  status: CourseStatus;
  modules: Module[];
  createdAt: number;
  updatedAt?: any;
  deletedAt?: any;
}

export type DashboardWidgetId = 'kpis' | 'errors' | 'revision' | 'session' | 'performance' | 'simulado' | 'active_courses' | 'broadcast_alerts';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  label: string;
  enabled: boolean;
  order: number;
}

export interface SoundSettings {
  success: string;
  error: string;
  tick: string;
  timeout: string;
  fanfare: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  active: boolean;
  createdAt: number;
}

export interface SystemSettings {
  id: 'main';
  sounds: SoundSettings;
  animations: { enabled: boolean };
  maintenanceMode?: {
    enabled: boolean;
    restrictedModules: string[]; // ex: 'questions', 'courses'
    message: string;
  };
  dashboard: {
    widgets: DashboardWidgetConfig[];
  };
}

export interface ScientificDashboard {
  taxaAcerto: number;
  totalQuestoes: number;
  totalAcertos: number;
  dificuldadeIdeal: string;
  risco: 'BAIXO' | 'MÉDIO' | 'ALTO';
  materiasZPD: string[];
  topErros: { topic: string; subject: string; count: number }[];
  revisaoDoDia: { topic: string; subject: string; daysSince: number }[];
  proximaMissao: { titulo: string; descricao: string; link?: string };
  sessaoSugerida: { materias: { name: string; qCount: number }[] };
  simulado: { notaAtual: number; notaCorte: number };
  consistencia: { nivel: string; status: string };
  alertasCognitivos: { type: 'DANGER' | 'WARNING' | 'SUCCESS'; msg: string }[];
  subjectStats: { name: string; accuracy: number; total: number }[];
  coursesProgress: any[];
}

export interface AuditSummary {
  questionsAnalyzed: number;
  brokenRefs: number;
  orphanAttempts: number;
  usersRepaired: number;
  logs: string[];
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  entityType: 'QUESTION' | 'COURSE' | 'USER' | 'SETTINGS' | 'NOTIFICATION';
  entityId: string;
  timestamp: any;
  payloadBefore?: any;
  payloadAfter?: any;
}
