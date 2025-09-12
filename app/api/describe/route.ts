import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

const client = new OpenAI();


// 配置Gemini API客户端
const geminiClient = new OpenAI({
  apiKey: "AIzaSyD17_CIw8en9ZUGNfW8HUdWF-h0cdcD3Ok",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});


export async function POST(request: NextRequest) {
  

}
