


import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDPpmEWmjXqzMp_T2EZcF_6G3O2q1vFnxE");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


export async function aiUnderStandVideo(videoUrl, summary, onChunk) {
  console.log("Analyzing YouTube video:", videoUrl);

  try {
    // Use provided video URL or fallback to default
    const targetVideoUrl =
      videoUrl || process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_URL;

    const result = await model.generateContentStream([
      " This is my video summary: " +
        summary +
        "Check and point out grammatical errors in sentences ,get corrected version of my summary. Then Please summarize this video in 10-20 sentences include the main activities or events in the video. and compare with my summary: Then Give me a score with a ten-point system.  score with one ⭐️,Each point is represented by a star. every section's title should be distinguished followed a line break",
      {
        fileData: {
          fileUri: targetVideoUrl,
        },
      },
    ]);
    
    // Stream chunks in real-time
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      console.log("----" + fullText + "----");
      // Call the callback function with each chunk for real-time display
      if (onChunk && typeof onChunk === 'function') {
        onChunk(chunkText, fullText);
      }
    }
    
    return fullText || "无法分析视频内容";
  } catch (error) {
    console.error("Error analyzing YouTube video:", error);
    return "视频分析失败，请检查网络连接或稍后重试。";
  }
}

// "Please analyze this video in English, including: 
// 1. The main content and setting of the video 
// 2. The main activities or events in the video
// 3. The overall atmosphere and theme of the video. Please summarize in 3-4 sentences.",
