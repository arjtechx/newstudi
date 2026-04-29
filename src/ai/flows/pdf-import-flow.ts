
'use server';
/**
 * @fileOverview Flow para extração de questões de PDFs com suporte a checkpoints de página.
 * Otimizado para eficiência de tokens e prevenção de duplicatas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PDFImportInputSchema = z.object({
  pdfDataUri: z.string().describe("O PDF codificado em Base64."),
  materiaFallback: z.string().optional().default("GCM Maricá - Geral"),
  startPage: z.number().int().default(1).describe("A página de início para análise."),
  alreadyFoundQuestions: z.array(z.string()).optional().describe("Trechos de questões já extraídas para evitar repetição."),
});

const ExtractedQuestionSchema = z.object({
  materia: z.string().describe('A matéria da questão.'),
  assunto: z.string().describe('O assunto específico.'),
  enunciado: z.string().describe('O texto da pergunta.'),
  alternativas: z.array(z.string()).min(4).max(5).describe('As alternativas.'),
  correta: z.number().int().describe('O índice da resposta correta (0 a 4).'),
  explicacao: z.string().describe('Justificativa da resposta.'),
  nivelDificuldade: z.enum(['Fácil', 'Médio', 'Difícil']).describe('Nível de complexidade.'),
  paginaDocumento: z.number().int().optional().describe('Página onde a questão foi encontrada.'),
});

const PDFImportOutputSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
  lastPageAnalyzed: z.number().int().describe('A última página que o sistema processou.'),
  hasMore: z.boolean().describe('Se existem mais questões visíveis no documento.'),
});

export type PDFImportOutput = z.infer<typeof PDFImportOutputSchema>;

export async function importFromPDF(input: z.infer<typeof PDFImportInputSchema>): Promise<PDFImportOutput> {
  return pdfImportFlow(input);
}

const pdfImportPrompt = ai.definePrompt({
  name: 'pdfImportPrompt',
  input: { schema: PDFImportInputSchema },
  output: { schema: PDFImportOutputSchema },
  prompt: `Você é um extrator de dados de alta performance especializado em concursos públicos.

OBJETIVO:
Extraia questões de múltipla escolha deste documento PDF. 

INSTRUÇÕES DE CURSOR:
1. Comece a análise especificamente da página {{startPage}}.
2. Extraia entre 5 a 10 questões por lote para evitar timeouts.
3. Se encontrar questões nas páginas seguintes, continue até atingir o limite do lote.
4. Informe em "lastPageAnalyzed" qual foi a página da última questão extraída.
5. Se perceber que há mais questões após o lote atual, defina "hasMore" como true.

EVITE DUPLICATAS:
{{#if alreadyFoundQuestions}}
Ignore questões que iniciam com:
{{#each alreadyFoundQuestions}}
- {{{this}}}
{{/each}}
{{/if}}

Documento: {{media url=pdfDataUri}}`,
});

const pdfImportFlow = ai.defineFlow(
  {
    name: 'pdfImportFlow',
    inputSchema: PDFImportInputSchema,
    outputSchema: PDFImportOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await pdfImportPrompt({
        ...input,
        alreadyFoundQuestions: input.alreadyFoundQuestions?.slice(-10) || []
      });

      if (!output) {
        throw new Error('Falha na resposta do motor de IA.');
      }

      return output;
    } catch (error: any) {
      console.error('Erro na extração PDF:', error);
      // Repropaga o erro original para que o frontend identifique o 429
      throw new Error(error.message || 'Erro ao processar PDF.');
    }
  }
);
