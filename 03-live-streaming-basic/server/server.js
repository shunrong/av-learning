/**
 * Node.js 直播服务器
 * 
 * 核心功能：
 * 1. RTMP 服务器：接收推流（端口 1935）
 * 2. HTTP 服务器：提供 HTTP-FLV 拉流（端口 8080）
 * 3. 静态文件服务：播放页面
 */

const NodeMediaServer = require('node-media-server');
const express = require('express');
const path = require('path');

// 配置参数
const config = {
  // RTMP 服务器配置（接收推流）
  rtmp: {
    port: 1935,                    // RTMP 默认端口
    chunk_size: 60000,             // RTMP 分块大小
    gop_cache: true,               // 缓存 GOP（关键帧组），新观众能快速看到画面
    ping: 30,                      // ping 间隔（秒）
    ping_timeout: 60               // ping 超时
  },

  // HTTP 服务器配置（拉流）
  http: {
    port: 8080,                    // HTTP 端口
    allow_origin: '*',             // 允许跨域
    mediaroot: './media'           // 媒体文件存储路径（可选）
  }
};

// 创建流媒体服务器实例
const nms = new NodeMediaServer(config);

// 事件监听：连接建立
nms.on('preConnect', (id, args) => {
  console.log('[预连接]', `id=${id} args=${JSON.stringify(args)}`);
});

// 事件监听：开始推流
nms.on('postPublish', (id, StreamPath, args) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 [推流开始]');
  console.log(`   流ID: ${id}`);
  console.log(`   推流地址: rtmp://localhost:1935${StreamPath}`);
  console.log(`   播放地址: http://localhost:8080${StreamPath}.flv`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// 事件监听：停止推流
nms.on('donePublish', (id, StreamPath, args) => {
  console.log('⏹️  [推流结束]', `StreamPath=${StreamPath}`);
});

// 事件监听：开始播放
nms.on('prePlay', (id, StreamPath, args) => {
  console.log('▶️  [观众加入]', `StreamPath=${StreamPath}`);
});

// 事件监听：停止播放
nms.on('donePlay', (id, StreamPath, args) => {
  console.log('⏸️  [观众离开]', `StreamPath=${StreamPath}`);
});

// 启动流媒体服务器
nms.run();

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║                                                       ║');
console.log('║        🎥  Node.js 直播服务器启动成功！               ║');
console.log('║                                                       ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('\n');
console.log('📌 服务信息：');
console.log('   RTMP 推流端口: 1935');
console.log('   HTTP 服务端口: 8080');
console.log('\n');
console.log('📖 使用指南：');
console.log('\n');
console.log('【推流】用 FFmpeg 推流：');
console.log('   ffmpeg -re -i test.mp4 -c copy -f flv rtmp://localhost:1935/live/stream');
console.log('\n');
console.log('【播放】打开浏览器：');
console.log('   http://localhost:3000/player.html');
console.log('\n');
console.log('【播放地址】：');
console.log('   HTTP-FLV: http://localhost:8080/live/stream.flv');
console.log('\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('提示：按 Ctrl+C 停止服务器');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n');

// Express 静态文件服务器
const app = express();

// 静态文件服务
app.use(express.static(path.join(__dirname, '../client')));

// 启动 Express 服务器（使用不同端口）
const HTTP_PORT = 3001;
app.listen(HTTP_PORT, () => {
  console.log(`🌐 网页服务器: http://localhost:${HTTP_PORT}`);
  console.log(`   首页: http://localhost:${HTTP_PORT}/index.html`);
  console.log(`   播放器: http://localhost:${HTTP_PORT}/player.html\n`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n正在关闭服务器...');
  nms.stop();
  process.exit(0);
});
