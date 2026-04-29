'use server';
/**
 * @fileOverview Flow para geração de imagens didáticas usando Imagen 4.0.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateIllustrationInputSchema = z.object({
  topic: z.string(),
  description: z.string(),
});

const GenerateIllustrationOutputSchema = z.object({
  imageUrl: z.string().describe('URL da imagem gerada em formato data URI.'),
});

export async function generateIllustration(input: z.infer<typeof GenerateIllustrationInputSchema>) {
  return generateIllustrationFlow(input);
}

const generateIllustrationFlow = ai.defineFlow(
  {
    name: 'generateIllustrationFlow',
    inputSchema: GenerateIllustrationInputSchema,
    outputSchema: GenerateIllustrationOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Crie uma ilustração didática e limpa para um material de estudo de Raciocínio Lógico. 
      O tema é "${input.topic}". 
      Descrição da ilustração: ${input.description}. 
      Estilo: Infográfico educacional, cores claras, fundo branco, estilo flat design, profissional.`,
    });

    if (!media) {
      throw new Error('Falha ao gerar ilustração.');
    }

    return {
      imageUrl: media.url,
    };
  }
);
