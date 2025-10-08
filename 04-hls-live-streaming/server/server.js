const NodeMediaServer = require('node-media-server');
const express = require('express');
const path = require('path');
const fs = require('fs');

/**
 * HLS 直播服务器
 * 
 * 架构：
 * RTMP 推流 → node-media-server → FFmpeg 切片 → HLS (m3u8 + TS)
 * 
 * 核心配置：
 * 1. RTMP: 接收推流（端口 1935）
 * 2. HTTP: 提供 HLS 文件（端口 8080）
 * 3. Trans: FFmpeg 转码配置（HLS 切片）
 */

const config = {
  // RTMP 推流配置（复用 03 项目）
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  
  // HTTP 服务配置（提供 HLS 文件）
  http: {
    port: 8080,
    mediaroot: './media',  // 媒体文件根目录
    allow_origin: '*'
  },
  
  // 转码配置（RTMP → HLS 自动转码）
  trans: {
    ffmpeg: '/opt/homebrew/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=6:hls_list_size=10:hls_flags=delete_segments]',
        dash: false,
        vc: 'copy',  // 视频编码：直接复制（不重新编码）
        ac: 'copy'   // 音频编码：直接复制
      }
    ]
  },
  
  // 日志配置
  logType: 3  // 0-不输出 1-错误 2-正常 3-调试 4-全部
};

// 创建媒体服务器
const nms = new NodeMediaServer(config);

// 事件监听
nms.on('preConnect', (id, args) => {
  console.log(`[预连接]`, `客户端 ${id} 正在连接...`, args);
});

nms.on('postConnect', (id, args) => {
  console.log(`[已连接]`, `客户端 ${id} 已连接`, args);
});

nms.on('doneConnect', (id, args) => {
  console.log(`[断开连接]`, `客户端 ${id} 已断开`, args);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                  🎥  推流开始                          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`📡 流路径: ${StreamPath}`);
  console.log(`🆔 会话ID: ${id}`);
  console.log(`📊 参数:`, args);
  console.log('');
  console.log('⚙️  正在启动 HLS 转码...');
  console.log('   FFmpeg 将自动生成：');
  console.log('   ├── index.m3u8 (播放列表)');
  console.log('   └── segment_*.ts (视频切片)');
  console.log('');
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                  ⏹️  推流结束                          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`📡 流路径: ${StreamPath}`);
  console.log(`🆔 会话ID: ${id}`);
  console.log('');
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log(`[观众加入] ${id} 开始播放 ${StreamPath}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log(`[观众离开] ${id} 停止播放 ${StreamPath}`);
});

// 启动媒体服务器
nms.run();

// 创建 Web 服务器（提供播放器页面）
const app = express();
const HTTP_PORT = 3000;

// 静态文件服务（播放器页面）
app.use(express.static(path.join(__dirname, '../client')));

// 媒体文件服务（HLS 文件）
app.use('/media', express.static(path.join(__dirname, '../media')));

// 首页路由
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HLS 直播系统</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 800px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.5em;
      border-left: 4px solid #667eea;
      padding-left: 10px;
    }
    .card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      margin: 15px 0;
    }
    .card h3 {
      color: #667eea;
      margin-bottom: 10px;
    }
    .code {
      background: #2d3748;
      color: #f7fafc;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      overflow-x: auto;
      margin: 10px 0;
    }
    .btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      text-decoration: none;
      margin: 10px 10px 10px 0;
      font-weight: bold;
      transition: all 0.3s;
    }
    .btn:hover {
      background: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
    }
    .status.success {
      background: #c6f6d5;
      color: #2f855a;
    }
    ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    li {
      margin: 8px 0;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 HLS 直播系统</h1>
    <p class="subtitle">基于 RTMP 推流 + HLS 切片的完整直播方案</p>
    
    <div class="section">
      <h2>🎯 快速开始</h2>
      <a href="/player.html" class="btn">📺 打开播放器</a>
      <a href="/compare.html" class="btn">📊 HTTP-FLV vs HLS 对比</a>
    </div>
    
    <div class="section">
      <h2>📡 服务状态</h2>
      <div class="card">
        <h3>RTMP 推流服务</h3>
        <span class="status success">● 运行中</span>
        <div class="code">rtmp://localhost:1935/live/stream</div>
        <p style="margin-top:10px; color:#666;">接收主播的 RTMP 推流</p>
      </div>
      
      <div class="card">
        <h3>HLS 播放地址</h3>
        <span class="status success">● 运行中</span>
        <div class="code">http://localhost:8080/live/stream/index.m3u8</div>
        <p style="margin-top:10px; color:#666;">HLS 播放地址（m3u8 + TS 切片）</p>
      </div>
    </div>
    
    <div class="section">
      <h2>🚀 推流方式</h2>
      
      <div class="card">
        <h3>方式1：使用测试视频推流</h3>
        <div class="code">ffmpeg -re -i test.mp4 -c copy -f flv rtmp://localhost:1935/live/stream</div>
      </div>
      
      <div class="card">
        <h3>方式2：使用摄像头推流</h3>
        <div class="code">ffmpeg -f avfoundation -i "0:0" -c:v libx264 -c:a aac -f flv rtmp://localhost:1935/live/stream</div>
      </div>
      
      <div class="card">
        <h3>方式3：使用推流客户端</h3>
        <p style="color:#666; margin-bottom:10px;">复用 03 项目的推流客户端：</p>
        <div class="code">cd ../03-live-streaming-basic/publisher
npm start
# 访问 http://localhost:3002</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📖 HLS vs HTTP-FLV</h2>
      <div class="card">
        <h3>核心区别</h3>
        <ul>
          <li><strong>HTTP-FLV</strong>: 长连接，直接转发，延迟 3-5秒</li>
          <li><strong>HLS</strong>: 切片 + 索引，CDN 友好，延迟 10-30秒</li>
        </ul>
      </div>
      
      <div class="card">
        <h3>适用场景</h3>
        <ul>
          <li><strong>HTTP-FLV</strong>: PC 端直播，需要低延迟互动</li>
          <li><strong>HLS</strong>: 移动端直播，大规模分发</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

// 启动 Web 服务器
app.listen(HTTP_PORT, () => {
  console.log('\n\n╔═══════════════════════════════════════════════════════╗');
  console.log('║        🎥  HLS 直播服务器启动成功！                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  console.log('📌 服务信息：');
  console.log(`   RTMP 推流端口: 1935`);
  console.log(`   HTTP 服务端口: 8080 (HLS 文件)`);
  console.log(`   Web 服务端口: ${HTTP_PORT}`);
  console.log('');
  
  console.log('🌐 访问地址：');
  console.log(`   首页: http://localhost:${HTTP_PORT}`);
  console.log(`   播放器: http://localhost:${HTTP_PORT}/player.html`);
  console.log('');
  
  console.log('📡 推流地址：');
  console.log(`   rtmp://localhost:1935/live/stream`);
  console.log('');
  
  console.log('📺 播放地址：');
  console.log(`   HLS: http://localhost:8080/live/stream/index.m3u8`);
  console.log('');
  
  console.log('⚠️  重要：需要手动启动 HLS 转码');
  console.log('   服务器已启动，但还需要运行 FFmpeg 来生成 HLS 切片');
  console.log('');
  console.log('📝 启动流程（3步）：');
  console.log('');
  console.log('   【第1步】确保此服务器已运行 ✅');
  console.log('');
  console.log('   【第2步】新开终端，启动推流客户端：');
  console.log('   cd ../03-live-streaming-basic/publisher');
  console.log('   npm start');
  console.log('   然后在 http://localhost:3002 开始推流');
  console.log('');
  console.log('   【第3步】再新开终端，启动 HLS 转码：');
  console.log('   cd 04-hls-live-streaming');
  console.log('   ffmpeg -i rtmp://localhost:1935/live/stream \\');
  console.log('     -c copy -f hls \\');
  console.log('     -hls_time 6 \\');
  console.log('     -hls_list_size 10 \\');
  console.log('     -hls_flags delete_segments \\');
  console.log('     media/live/stream/index.m3u8');
  console.log('');
  console.log('   完成后，访问播放器: http://localhost:3000/player.html');
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n正在关闭服务器...');
  nms.stop();
  process.exit(0);
});

