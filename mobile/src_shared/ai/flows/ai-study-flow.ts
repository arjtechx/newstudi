
'use server';
/**
 * @fileOverview Flow para o modo "Estudo Inteligente IA".
 * Atua como um tutor que gera micro-lições (teoria + questão) e avalia a técnica Feynman.
 * Otimizado para Raciocínio Lógico e Matemática.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LessonBlockInputSchema = z.object({
  topic: z.string(),
  subject: z.string(),
  difficultyLevel: z.number().int().min(1).max(3),
  previousError: z.boolean().optional(),
});

const LessonBlockOutputSchema = z.object({
  title: z.string(),
  theory: z.string().describe('Explicação simples de 3 a 5 linhas. Se for exatas, use notação clara.'),
  example: z.string().describe('Um exemplo prático do dia a dia de um cargo público aplicado ao tema.'),
  visualAidDescription: z.string().optional().describe('Descrição detalhada para uma imagem/diagrama de Venn/Fluxograma se for lógica/exatas.'),
  question: z.object({
    enunciado: z.string(),
    alternativas: z.array(z.string()).length(4),
    correta: z.number().int().min(0).max(3),
    explicacao: z.string(),
    banca: z.string().default('Prep IA'),
    ano: z.number().default(2026),
    nivelDificuldade: z.string(),
  }),
});

const FeynmanInputSchema = z.object({
  topic: z.string(),
  explanation: z.string(),
});

const FeynmanOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
  gaps: z.array(z.string()),
  isReady: z.boolean(),
});

const lessonPrompt = ai.definePrompt({
  name: 'lessonPrompt',
  input: { schema: LessonBlockInputSchema },
  output: { schema: LessonBlockOutputSchema },
  prompt: `Você é um professor de elite para concursos públicos.
Gere um bloco de estudo sobre "{{topic}}" da matéria "{{subject}}".
Nível: {{difficultyLevel}}.

REGRAS ESPECIAIS PARA EXATAS/RLM:
1. Se a matéria for Raciocínio Lógico ou Matemática, a explicação deve ser passo a passo.
2. Em visualAidDescription, descreva um diagrama lógico ou tabela que ajude a entender a operação.
3. Use notação matemática padrão (ex: P -> Q, ¬P).
4. O exemplo prático deve ser relacionado a uma situação cotidiana de um cargo público, se possível.

{{#if previousError}}Foque em uma explicação ainda mais simples, pois o aluno errou a questão anterior.{{/if}}`,
});

const feynmanPrompt = ai.definePrompt({
  name: 'feynmanPrompt',
  input: { schema: FeynmanInputSchema },
  output: { schema: FeynmanOutputSchema },
  prompt: `Avalie a explicação do aluno sobre "{{topic}}" usando a Técnica Feynman:
"{{{explanation}}}"

Se o tema envolver lógica ou matemática, verifique se os passos operacionais estão corretos.`,
});

export async function generateLessonBlock(input: z.infer<typeof LessonBlockInputSchema>) {
  const { output } = await lessonPrompt(input);
  return output!;
}

export async function evaluateFeynman(input: z.infer<typeof FeynmanInputSchema>) {
  const { output } = await feynmanPrompt(input);
  return output!;
}
