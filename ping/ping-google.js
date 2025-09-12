import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

const proxy = "http://127.0.0.1:7890"; // Clash 的本地代理端口
const agent = new HttpsProxyAgent(proxy);

fetch(
  "https://generativelanguage.googleapis.com/v1/models?key=AIzaSyDPpmEWmjXqzMp_T2EZcF_6G3O2q1vFnxE",
  {
    agent,
  }
)
  .then((res) => console.log("Status:", res.status))
  .catch((err) => console.error("Error:", err.message));
