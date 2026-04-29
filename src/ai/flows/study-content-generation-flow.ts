'use server';
/**
 * @fileOverview Flow para geração de material de estudo completo: Teoria (leitura) e Exercícios.
 * Ideal para alimentar o banco de dados com conteúdo didático dinâmico.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudyContentInputSchema = z.object({
  topic: z.string().describe('O tópico específico a ser gerado (ex: "Poder de Polícia").'),
  subject: z.string().describe('A matéria principal (ex: "Direito Administrativo").'),
  audience: z.string().default('Candidatos a concursos públicos').describe('O público alvo do conteúdo.'),
});

export type StudyContentInput = z.infer<typeof StudyContentInputSchema>;

const StudyContentOutputSchema = z.object({
  title: z.string().describe('Título atrativo para o material.'),
  readingContent: z.string().describe('Texto teórico detalhado em formato Markdown, focado nos pontos que mais caem em provas.'),
  summary: z.array(z.string()).describe('Lista de pontos chave para revisão rápida.'),
  exercises: z.array(z.object({
    enunciado: z.string().describe('O corpo da questão.'),
    alternativas: z.array(z.string()).min(4).max(5).describe('Lista de 4 ou 5 alternativas.'),
    correta: z.number().int().describe('Índice da alternativa correta (0 a 4).'),
    explicacao: z.string().describe('Explicação didática da resposta.'),
  })).describe('Lista de questões práticas sobre o tema.'),
});

export type StudyContentOutput = z.infer<typeof StudyContentOutputSchema>;

export async function generateStudyContent(input: StudyContentInput): Promise<StudyContentOutput> {
  return studyContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studyContentPrompt',
  input: { schema: StudyContentInputSchema },
  output: { schema: StudyContentOutputSchema },
  prompt: `Você é um professor especialista em concursos públicos.

Sua tarefa é gerar um material de estudo completo e dinâmico sobre:
Assunto: {{{topic}}}
Matéria: {{{subject}}}
Público: {{{audience}}}

O conteúdo deve ser dividido em:
1. **Teoria**: Um texto em Markdown rico, direto ao ponto, com destaques em negrito para termos importantes. Use exemplos práticos quando possível.
2. **Resumo**: 3 a 5 bullet points com "o que você não pode esquecer".
3. **Exercícios**: 3 questões inéditas no estilo de múltipla escolha.

Garanta que o JSON retornado siga estritamente o schema definido.`,
});

const studyContentFlow = ai.defineFlow(
  {
    name: 'studyContentFlow',
    inputSchema: StudyContentInputSchema,
    outputSchema: StudyContentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Falha ao gerar conteúdo de estudo.');
    return output;
  }
);
