import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

// 配置你的代理
// 1) HTTP/HTTPS 代理示例: "http://127.0.0.1:7890"
// 2) SOCKS5 代理示例: "socks5://127.0.0.1:1080"
const proxy = "http://127.0.0.1:7890";

// 根据代理类型自动选择 agent
let agent;
if (proxy.startsWith("socks5://")) {
  agent = new SocksProxyAgent(proxy);
} else {
  agent = new HttpsProxyAgent(proxy);
}

// 输入你想测试的目标 IP 或域名
const target = "https://142.250.77.10"; // Google IP 示例

async function checkAccess(url) {
  try {
    const res = await fetch(url, { agent });
    console.log(`访问成功! 状态码: ${res.status}`);
  } catch (err) {
    console.error("访问失败:", err.message);
  }
}

checkAccess(target);
