import { ai } from './src/ai/genkit';

async function main() {
  try {
    const res = await ai.generate({
      prompt: 'say hi',
    });
    console.log("Success:", res.text);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
