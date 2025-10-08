/**
 * 推流客户端服务器
 * 提供 Web UI 和 WebSocket API
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const LivePublisher = require('./LivePublisher');

const app = express();
const PORT = 3002;

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// HTTP API
app.post('/api/start', (req, res) => {
  const { rtmpUrl, inputType, inputSource, quality } = req.body;
  
  try {
    if (publisher.getStatus().isLive) {
      return res.status(400).json({ error: '已经在直播中' });
    }

    publisher.startLive({
      rtmpUrl,
      inputType,
      inputSource,
      quality
    });

    res.json({ success: true, message: '开始推流' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stop', (req, res) => {
  try {
    publisher.stopLive();
    res.json({ success: true, message: '停止推流' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json(publisher.getStatus());
});

// WebSocket 服务
const server = app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║                                            ║');
  console.log('║     📡 推流客户端已启动                     ║');
  console.log('║                                            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Web 控制面板: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

const wss = new WebSocket.Server({ server });

// 创建推流器实例
const publisher = new LivePublisher();

// WebSocket 连接
wss.on('connection', (ws) => {
  console.log('[WebSocket] 新客户端连接');

  // 发送初始状态
  ws.send(JSON.stringify({
    type: 'status',
    data: publisher.getStatus()
  }));

  // 推流事件转发到 WebSocket
  const handlers = {
    started: (data) => {
      ws.send(JSON.stringify({ type: 'started', data }));
    },
    stats: (stats) => {
      ws.send(JSON.stringify({ type: 'stats', data: stats }));
    },
    error: (error) => {
      ws.send(JSON.stringify({ type: 'error', data: error }));
    },
    stopped: () => {
      ws.send(JSON.stringify({ type: 'stopped', data: {} }));
    }
  };

  publisher.on('started', handlers.started);
  publisher.on('stats', handlers.stats);
  publisher.on('error', handlers.error);
  publisher.on('stopped', handlers.stopped);

  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start') {
        publisher.startLive(data.config);
      } else if (data.type === 'stop') {
        publisher.stopLive();
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: error.message }
      }));
    }
  });

  // 清理
  ws.on('close', () => {
    console.log('[WebSocket] 客户端断开');
    publisher.off('started', handlers.started);
    publisher.off('stats', handlers.stats);
    publisher.off('error', handlers.error);
    publisher.off('stopped', handlers.stopped);
  });
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  publisher.stopLive();
  server.close(() => {
    process.exit(0);
  });
});
