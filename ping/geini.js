import { HttpsProxyAgent } from "https-proxy-agent";
const proxyAgent = new HttpsProxyAgent("http://127.0.0.1:7890");

const url =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const requestInit = {
  body: '{"contents":[{"parts":[{"text":"How does AI work?"}],"role":"user"}]}',
  headers: {
    "User-Agent": "google-genai-sdk/1.17.0 gl-node/v22.2.0",
    "x-goog-api-client": "google-genai-sdk/1.17.0 gl-node/v22.2.0",
    "Content-Type": "application/json",
    "x-goog-api-key": "AIzaSyDPpmEWmjXqzMp_T2EZcF_6G3O2q1vFnxE",
  },
  method: "POST",
  agent: proxyAgent,
};


fetch(url, requestInit).catch((e) => {
  console.log(e, "-----");
  throw new Error(`exception ${e} sending request`);
});
