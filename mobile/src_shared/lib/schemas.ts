
import { z } from 'zod';

// Base schemas for metadata
export const TextMetadataSchema = z.object({
  fontSize: z.enum(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl']).optional(),
  fontWeight: z.enum(['normal', 'medium', 'semibold', 'bold', 'black']).optional(),
  fontFamily: z.enum(['sans', 'serif', 'mono', 'display']).optional(),
  textColor: z.enum(['default', 'primary', 'accent', 'success', 'warning', 'danger', 'muted']).optional(),
}).optional();

export const QuizMetadataSchema = z.object({
  alternatives: z.array(z.string()).min(1),
  correct: z.coerce.number().int(),
  explanation: z.string().optional().default("Sem explicação disponível."),
});

export const TableMetadataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.object({
    cells: z.array(z.string())
  })),
});

// Discriminated union for ContentBlock
export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string().optional(), type: z.literal('h1'), value: z.string().trim(), metadata: TextMetadataSchema }),
  z.object({ id: z.string().optional(), type: z.literal('p'), value: z.string().trim(), metadata: TextMetadataSchema }),
  z.object({ id: z.string().optional(), type: z.literal('law'), value: z.string().trim(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('example'), value: z.string().trim(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('warning'), value: z.string().trim(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('tip'), value: z.string().trim(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('image'), value: z.string().url(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('video'), value: z.string().url(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('audio'), value: z.string().url(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('slides'), value: z.string().url(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('math'), value: z.string().trim(), metadata: z.any().optional() }),
  z.object({ id: z.string().optional(), type: z.literal('quiz'), value: z.string().trim(), metadata: QuizMetadataSchema }),
  z.object({ id: z.string().optional(), type: z.literal('table'), value: z.string().optional().default(""), metadata: TableMetadataSchema }),
]);

export const LessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "O título do tópico é obrigatório."),
  blocks: z.array(ContentBlockSchema),
  type: z.enum(['reading', 'video', 'quiz']).optional().default('reading'),
  estimatedTime: z.coerce.number().optional().default(15),
});

export const ModuleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "O título da matéria é obrigatório."),
  lessons: z.array(LessonSchema),
});

export const CourseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "O título do curso é obrigatório."),
  description: z.string().trim().min(1, "A descrição do curso é obrigatória."),
  category: z.string().trim().min(1, "A categoria do curso é obrigatória."),
  status: z.enum(['draft', 'published']).optional().default('draft'), // Nova opção de visibilidade
  thumbnail: z.string().url("A URL da thumbnail deve ser válida.").optional().default("https://picsum.photos/seed/elite/800/400"),
  modules: z.array(ModuleSchema),
  createdAt: z.any().optional().nullable(),
  updatedAt: z.any().optional().nullable(),
  deletedAt: z.any().optional().nullable(),
});
export const CourseListSchema = z.array(CourseSchema);

export const QuestionSchema = z.object({
    id: z.string().optional(),
    materia: z.string({ required_error: "O campo 'materia' é obrigatório." }).trim().min(1, "O campo 'materia' não pode estar vazio."),
    assunto: z.string().trim().optional().default('Geral'),
    enunciado: z.string({ required_error: "O campo 'enunciado' é obrigatório." }).trim().min(1, "O campo 'enunciado' não pode estar vazio."),
    alternativas: z.array(z.string()).min(1, "A questão deve ter pelo menos 1 alternativa."),
    correta: z.coerce.number({ invalid_type_error: "O campo 'correta' deve ser um número." }).int(),
    explicacao: z.string().trim().optional().default('Sem explicação disponível.'),
    nivelDificuldade: z.enum(['Fácil', 'Médio', 'Difícil', 'Hardcore']).optional().default('Médio'),
    banca: z.string().trim().optional().nullable(),
    ano: z.coerce.number().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    xpCustom: z.coerce.number().optional().nullable(),
    createdAt: z.any().optional().nullable(),
    updatedAt: z.any().optional().nullable(),
    deletedAt: z.any().optional().nullable(),
});
export const QuestionListSchema = z.array(QuestionSchema);


export const UserProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string().optional(),
    email: z.string().email().nullable(),
    role: z.enum(['student', 'admin']),
    phone: z.string().optional(),
    photoUrl: z.string().url().optional(),
    twoFactorEnabled: z.boolean().optional(),
    sessionStart: z.number().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
    xp: z.number().optional().default(0),
    level: z.number().optional().default(1),
    studyStreak: z.number().optional().default(0),
    lastStudyDate: z.any().optional(),
    completedLessons: z.array(z.string()).optional().default([]),
});
export const UserListSchema = z.array(UserProfileSchema);

export const FullBackupSchema = z.object({
    version: z.string().optional(),
    exportDate: z.string().optional(),
    questions: z.array(z.any()).optional(),
    courses: z.array(z.any()).optional(),
    users: z.array(z.any()).optional(),
});
