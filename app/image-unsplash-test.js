import { GoogleGenAI } from "@google/genai";
// import * as fs from "node:fs";




const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY,
});


export async function aiDescribeImage(imgParam, summary) {
  const response = await fetch(imgParam);
  const imageArrayBuffer = await response.arrayBuffer();
  const base64ImageData = Buffer.from(imageArrayBuffer).toString("base64");

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageData,
        },
      },
      {
        text:
          "summarize this image in 1 sentences. and compare with my summary:" +
          summary +
          "and if possible, please point out my Grammar ，sentence or words errors. Give me a score with a ten-point system",
      },
    ],
  });
  return result.text;
}