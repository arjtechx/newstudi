'use server';
/**
 * @fileOverview A Genkit flow for providing personalized study recommendations based on student performance data.
 *
 * - getPersonalizedStudyRecommendations - A function that generates study recommendations.
 * - PersonalizedStudyRecommendationsInput - The input type for the getPersonalizedStudyRecommendations function.
 * - PersonalizedStudyRecommendationsOutput - The return type for the getPersonalizedStudyRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PersonalizedStudyRecommendationsInputSchema = z.object({
  studentName: z.string().describe('The name of the student for personalized recommendations.'),
  performanceRecords: z.array(
    z.object({
      subject: z.string().describe('The subject of the question (e.g., "Direito Constitucional").'),
      topic: z.string().describe('The specific topic within the subject (e.g., "Art. 144").'),
      isCorrect: z.boolean().describe('True if the answer was correct, false otherwise.'),
      questionId: z.string().describe('The ID of the question answered.'),
    })
  ).describe('An array of historical performance records for the student.'),
});
export type PersonalizedStudyRecommendationsInput = z.infer<typeof PersonalizedStudyRecommendationsInputSchema>;

const PersonalizedStudyRecommendationsOutputSchema = z.object({
  weakAreas: z.array(z.string().describe("A list of identified weak subjects or topics, e.g., 'Direito Constitucional - Art. 144'.")),
  studyRecommendations: z.array(z.string().describe("A list of actionable study recommendations, e.g., 'Review constitutional principles related to Art. 144.'.")),
  suggestedTopicsForReview: z.array(z.string().describe("A list of specific topics (e.g., 'Art. 144 (Direito Constitucional)') that the student should prioritize for review based on their weaknesses.")),
});
export type PersonalizedStudyRecommendationsOutput = z.infer<typeof PersonalizedStudyRecommendationsOutputSchema>;

export async function getPersonalizedStudyRecommendations(input: PersonalizedStudyRecommendationsInput): Promise<PersonalizedStudyRecommendationsOutput> {
  return personalizedStudyRecommendationsFlow(input);
}

const personalizedStudyPrompt = ai.definePrompt({
  name: 'personalizedStudyPrompt',
  input: { schema: z.object({ studentName: z.string(), performanceSummary: z.string() }) },
  output: { schema: PersonalizedStudyRecommendationsOutputSchema },
  prompt: `You are an intelligent study assistant for civil service exam preparation. Your goal is to analyze a student's performance and provide personalized study recommendations to help them improve.

Here is the student's name: {{{studentName}}}

Here is a summary of their past performance, highlighting areas where they have struggled:
{{{performanceSummary}}}

Based on this performance summary, identify the student's main weak areas and provide actionable study recommendations. Focus on specific subjects and topics.

When generating your response, adhere to the following guidelines:
1.  **weakAreas**: List the specific subjects or topics where the student has shown poor performance or a high error rate. Use the format 'Subject - Topic' if applicable, or just 'Subject'.
2.  **studyRecommendations**: Provide concise, actionable advice for how the student can improve in each weak area. Suggest reviewing concepts, practicing specific types of questions, or focusing on particular topics.
3.  **suggestedTopicsForReview**: List specific topics or sub-topics that the student should prioritize for review based on their identified weaknesses. Use the format 'Topic (Subject)'.

Ensure your tone is encouraging and supportive. If no specific weak areas are detected, provide general advice for continued learning.`,
});

const personalizedStudyRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedStudyRecommendationsFlow',
    inputSchema: PersonalizedStudyRecommendationsInputSchema,
    outputSchema: PersonalizedStudyRecommendationsOutputSchema,
  },
  async (input) => {
    let performanceSummary = `Performance data for student ${input.studentName}:

`;
    const subjectStats: Record<string, { total: number; correct: number; topics: Record<string, { total: number; correct: number; }>; }> = {};

    if (input.performanceRecords.length === 0) {
      performanceSummary = `No performance records available for student ${input.studentName}. Cannot provide specific recommendations without data.`;
    } else {
      input.performanceRecords.forEach(record => {
        if (!subjectStats[record.subject]) {
          subjectStats[record.subject] = { total: 0, correct: 0, topics: {} };
        }
        subjectStats[record.subject].total++;
        if (record.isCorrect) {
          subjectStats[record.subject].correct++;
        }

        if (!subjectStats[record.subject].topics[record.topic]) {
          subjectStats[record.subject].topics[record.topic] = { total: 0, correct: 0 };
        }
        subjectStats[record.subject].topics[record.topic].total++;
        if (record.isCorrect) {
          subjectStats[record.subject].topics[record.topic].correct++;
        }
      });

      const analyzedWeaknesses: string[] = [];
      let overallPerformanceGood = true;

      for (const subject in subjectStats) {
        const sub = subjectStats[subject];
        const subjectAccuracy = sub.total > 0 ? (sub.correct / sub.total) * 100 : 0;
        performanceSummary += `Subject: ${subject} - Accuracy: ${subjectAccuracy.toFixed(2)}% (${sub.correct}/${sub.total})\n`;

        if (subjectAccuracy < 70 && sub.total >= 10) { // Arbitrary threshold and minimum questions
          analyzedWeaknesses.push(`${subject} (Overall performance is low: ${subjectAccuracy.toFixed(2)}% accurate).`);
          overallPerformanceGood = false;
        }

        for (const topic in sub.topics) {
          const top = sub.topics[topic];
          const topicAccuracy = top.total > 0 ? (top.correct / top.total) * 100 : 0;
          performanceSummary += `  Topic: ${topic} - Accuracy: ${topicAccuracy.toFixed(2)}% (${top.correct}/${top.total})\n`;

          if (topicAccuracy < 60 && top.total >= 5) { // Arbitrary threshold and minimum questions for topic
            analyzedWeaknesses.push(`${topic} in ${subject} (Struggles with ${topicAccuracy.toFixed(2)}% accurate).`);
            overallPerformanceGood = false;
          }
        }
        performanceSummary += '\n';
      }

      if (overallPerformanceGood) {
        performanceSummary += "Based on available data, the student's performance is generally strong across all reviewed subjects and topics. Suggest continued practice.\n";
      } else {
        performanceSummary += `\nIdentified specific struggles: ${analyzedWeaknesses.join(' ')}\n`;
      }
    }

    const { output } = await personalizedStudyPrompt({ studentName: input.studentName, performanceSummary });
    return output!;
  }
);
