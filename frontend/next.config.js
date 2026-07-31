const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // 强制以本项目目录为 tracing root，避免服务器上因上级目录存在
  // package.json / package-lock.json 而把 standalone 产物嵌套到子目录
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
