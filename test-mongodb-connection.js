const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// 读取.env.local文件
function loadEnvFile() {
  const envPath = path.join(__dirname, ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");
    lines.forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// 加载环境变量
loadEnvFile();

// 从环境变量获取MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ 错误: 未设置 MONGODB_URI 环境变量");
  console.log(
    '请设置环境变量: export MONGODB_URI="your_mongodb_connection_string"'
  );
  process.exit(1);
}

async function testMongoDBConnection() {
  console.log("🔍 正在测试MongoDB连接...");
  console.log(
    `连接地址: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`
  ); // 隐藏密码

  try {
    // 设置连接选项
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    // 尝试连接
    const startTime = Date.now();
    const mongooseInstance = await mongoose.connect(MONGODB_URI, opts);
    const endTime = Date.now();

    console.log("✅ MongoDB连接成功!");
    console.log(`⏱️  连接耗时: ${endTime - startTime}ms`);
    console.log(`📊 数据库名称: ${mongooseInstance.connection.name}`);
    console.log(`🌐 主机地址: ${mongooseInstance.connection.host}`);
    console.log(`🔌 端口: ${mongooseInstance.connection.port}`);

    // 测试数据库操作
    console.log("\n🧪 测试数据库操作...");

    // 获取数据库列表
    const adminDb = mongooseInstance.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    console.log(`📚 可用数据库数量: ${dbList.databases.length}`);

    // 获取当前数据库的集合列表
    const collections = await mongooseInstance.connection.db
      .listCollections()
      .toArray();
    console.log(`📁 当前数据库集合数量: ${collections.length}`);

    if (collections.length > 0) {
      console.log("📋 集合列表:");
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
    }

    // 测试ping操作
    const pingResult = await adminDb.ping();
    console.log(`🏓 Ping测试: ${pingResult.ok === 1 ? "成功" : "失败"}`);

    console.log("\n🎉 所有测试通过! MongoDB连接完全正常。");
  } catch (error) {
    console.error("❌ MongoDB连接失败:");
    console.error("错误详情:", error.message);

    // 提供常见错误的解决方案
    if (error.message.includes("ECONNREFUSED")) {
      console.log("\n💡 可能的解决方案:");
      console.log("1. 检查MongoDB服务是否正在运行");
      console.log("2. 检查连接地址和端口是否正确");
      console.log("3. 检查防火墙设置");
    } else if (error.message.includes("Authentication failed")) {
      console.log("\n💡 可能的解决方案:");
      console.log("1. 检查用户名和密码是否正确");
      console.log("2. 检查数据库名称是否正确");
      console.log("3. 检查用户是否有访问权限");
    } else if (error.message.includes("ENOTFOUND")) {
      console.log("\n💡 可能的解决方案:");
      console.log("1. 检查主机名是否正确");
      console.log("2. 检查网络连接");
      console.log("3. 检查DNS设置");
    }

    process.exit(1);
  } finally {
    // 关闭连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 已断开MongoDB连接");
    }
  }
}

// 运行测试
testMongoDBConnection()
  .then(() => {
    console.log("\n✨ 测试完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 测试过程中发生未预期的错误:", error);
    process.exit(1);
  });
