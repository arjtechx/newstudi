'use server';
/**
 * @fileOverview A Genkit flow for automatically generating new exam questions based on specified topics, difficulty, and format.
 *
 * - generateQuestion - A function that handles the question generation process.
 * - GenerateQuestionInput - The input type for the generateQuestion function.
 * - GenerateQuestionOutput - The return type for the generateQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionInputSchema = z.object({
  topic: z
    .string()
    .describe(
      'The specific topic for which to generate a question (e.g., "Art. 144 do Código Penal").'
    ),
  subject: z
    .string()
    .describe('The subject area of the question (e.g., "Direito Constitucional").'),
  difficulty: z
    .enum(['Fácil', 'Médio', 'Difícil'])
    .describe('The desired difficulty level for the question.'),
  numberOfAlternatives: z
    .number()
    .int()
    .min(4)
    .max(6)
    .default(4)
    .describe('The number of alternatives the question should have (minimum 4, maximum 6).'),
});
export type GenerateQuestionInput = z.infer<typeof GenerateQuestionInputSchema>;

const GenerateQuestionOutputSchema = z.object({
  enunciado: z.string().describe('The statement or body of the question.'),
  alternativas: z.array(z.string()).describe('An array of possible answer choices.'),
  correta: z
    .number()
    .int()
    .describe('The 0-indexed position of the correct alternative in the alternatives array.'),
  explicacao: z.string().describe('A detailed explanation for the correct answer.'),
  materia: z.string().describe('The subject of the question, e.g., "Direito Constitucional".'),
  assunto: z.string().describe('The specific topic or issue, e.g., "Art. 144".'),
  nivelDificuldade: z
    .string()
    .describe('The difficulty level of the question, e.g., "Fácil", "Médio", "Difícil".'),
});
export type GenerateQuestionOutput = z.infer<typeof GenerateQuestionOutputSchema>;

export async function generateQuestion(
  input: GenerateQuestionInput
): Promise<GenerateQuestionOutput> {
  return generateQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionPrompt',
  input: { schema: GenerateQuestionInputSchema },
  output: { schema: GenerateQuestionOutputSchema },
  prompt: `You are an expert content creator for public service exam questions.
Your task is to create a multiple-choice question in Portuguese based on the provided topic, subject, and difficulty level.

The question must have exactly {{numberOfAlternatives}} alternatives. One of these alternatives must be correct.
Provide a comprehensive explanation for the correct answer.

Ensure that the output strictly adheres to the JSON schema provided.

Subject: {{{subject}}}
Topic: {{{topic}}}
Difficulty: {{{difficulty}}}`,
});

const generateQuestionFlow = ai.defineFlow(
  {
    name: 'generateQuestionFlow',
    inputSchema: GenerateQuestionInputSchema,
    outputSchema: GenerateQuestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate question output.');
    }
    return { ...output, materia: input.subject, assunto: input.topic, nivelDificuldade: input.difficulty };
  }
);
