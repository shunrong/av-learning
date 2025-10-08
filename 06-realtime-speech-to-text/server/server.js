const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const MockASRService = require('./MockASRService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// 创建Mock ASR服务实例
const asrService = new MockASRService();

// 存储活跃的WebSocket连接
const clients = new Map();

// WebSocket连接处理
wss.on('connection', (ws) => {
  const clientId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  console.log(`\n🔌 新客户端连接: ${clientId}`);
  
  // 存储客户端信息
  clients.set(clientId, {
    ws: ws,
    connectedAt: new Date(),
    audioChunks: 0
  });

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: clientId,
    message: '连接成功！开始录音后会实时返回识别结果'
  }));

  // 接收客户端消息
  ws.on('message', async (message) => {
    try {
      // 尝试解析为JSON（控制消息）
      try {
        const data = JSON.parse(message);
        handleControlMessage(ws, clientId, data);
        return;
      } catch (e) {
        // 不是JSON，当作音频数据处理
      }

      // 处理音频数据
      await handleAudioData(ws, clientId, message);

    } catch (error) {
      console.error(`❌ 处理消息错误 [${clientId}]:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  // 连接关闭
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client) {
      const duration = Math.floor((Date.now() - client.connectedAt.getTime()) / 1000);
      console.log(`\n👋 客户端断开: ${clientId}`);
      console.log(`   - 连接时长: ${duration}秒`);
      console.log(`   - 音频片段数: ${client.audioChunks}`);
    }
    clients.delete(clientId);
  });

  // 错误处理
  ws.on('error', (error) => {
    console.error(`❌ WebSocket错误 [${clientId}]:`, error);
  });
});

/**
 * 处理控制消息
 */
function handleControlMessage(ws, clientId, data) {
  console.log(`📨 控制消息 [${clientId}]:`, data.type);

  switch (data.type) {
    case 'start':
      ws.send(JSON.stringify({
        type: 'started',
        message: '开始识别'
      }));
      break;

    case 'stop':
      ws.send(JSON.stringify({
        type: 'stopped',
        message: '停止识别'
      }));
      break;

    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
      break;

    default:
      console.log(`⚠️  未知的控制消息类型: ${data.type}`);
  }
}

/**
 * 处理音频数据
 */
async function handleAudioData(ws, clientId, audioData) {
  const client = clients.get(clientId);
  if (!client) return;

  client.audioChunks++;

  // 每10个音频片段输出一次日志，避免刷屏
  if (client.audioChunks % 10 === 0) {
    console.log(`🎤 [${clientId}] 已接收 ${client.audioChunks} 个音频片段`);
  }

  try {
    // 使用Mock ASR服务处理音频
    const result = await asrService.processAudio(audioData);

    // 返回识别结果
    ws.send(JSON.stringify({
      type: 'result',
      data: {
        text: result.text,
        isFinal: result.isFinal,
        confidence: result.confidence,
        timestamp: result.timestamp
      }
    }));

  } catch (error) {
    console.error(`❌ ASR处理错误 [${clientId}]:`, error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'ASR处理失败'
    }));
  }
}

// HTTP路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 获取服务器统计信息
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      activeClients: clients.size,
      asrStats: asrService.getStats(),
      clients: Array.from(clients.entries()).map(([id, client]) => ({
        id: id,
        connectedAt: client.connectedAt,
        audioChunks: client.audioChunks
      }))
    }
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || '服务器内部错误' 
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🎤 实时语音转文字服务器');
  console.log('========================================');
  console.log(`🌐 HTTP服务: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📊 统计信息: http://localhost:${PORT}/api/stats`);
  console.log('========================================');
  console.log('💡 使用Mock ASR服务（模拟识别）');
  console.log('⏳ 等待客户端连接...\n');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('\n\n🛑 收到终止信号，正在关闭服务器...');
  
  // 关闭所有WebSocket连接
  clients.forEach((client, id) => {
    client.ws.close();
  });
  
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

