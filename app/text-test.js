import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDPpmEWmjXqzMp_T2EZcF_6G3O2q1vFnxE",
});

export async function aiCreateText() {
  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a 800 words",
  });
  
  // Collect streaming chunks
  let fullText = '';
  for await (const chunk of response) {
    console.log("----" + fullText + "----");

    fullText += chunk.text;
  }
  
  return fullText;
}

