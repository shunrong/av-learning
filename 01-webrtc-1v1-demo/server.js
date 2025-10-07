/**
 * WebRTC 信令服务器
 * 功能：转发 offer、answer、ICE candidate
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 创建 HTTP 服务器（用于提供前端页面）
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/client.html') {
    fs.readFile(path.join(__dirname, 'client.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading client.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// 存储连接的客户端
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('新客户端连接');
  
  // 分配客户端ID（简单用时间戳）
  const clientId = Date.now().toString();
  clients.set(clientId, ws);
  
  // 发送客户端ID
  ws.send(JSON.stringify({
    type: 'connected',
    clientId
  }));
  
  // 通知客户端当前在线人数
  broadcast({
    type: 'user-count',
    count: clients.size
  });
  
  console.log(`客户端 ${clientId} 已连接，当前在线: ${clients.size} 人`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`收到消息类型: ${message.type}`);
      
      // 处理不同类型的消息
      switch (message.type) {
        case 'call-request':
          // 呼叫请求：转发给对方
          console.log(`${clientId} 发起呼叫`);
          broadcastExcept(clientId, {
            type: 'call-request',
            from: clientId
          });
          break;

        case 'call-accepted':
          // 接听：通知发起方
          console.log(`${clientId} 接听了电话`);
          broadcastExcept(clientId, {
            type: 'call-accepted',
            from: clientId
          });
          break;

        case 'call-rejected':
          // 拒绝：通知发起方
          console.log(`${clientId} 拒绝了电话`);
          broadcastExcept(clientId, {
            type: 'call-rejected',
            from: clientId
          });
          break;

        case 'call-ended':
          // 挂断：通知对方
          console.log(`${clientId} 挂断了电话`);
          broadcastExcept(clientId, {
            type: 'call-ended',
            from: clientId
          });
          break;

        // WebRTC 信令消息：转发给对方
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          broadcastExcept(clientId, {
            ...message,
            from: clientId
          });
          console.log(`已转发 ${message.type} 从 ${clientId}`);
          break;

        default:
          console.log(`未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error('消息解析错误:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`客户端 ${clientId} 已断开，当前在线: ${clients.size} 人`);
    
    // 通知剩余客户端
    broadcast({
      type: 'user-count',
      count: clients.size
    });
    
    // 通知对方用户离开
    broadcast({
      type: 'user-left',
      clientId
    });
  });

  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
});

// 广播消息给所有客户端
function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// 广播消息给除了指定客户端外的所有人
function broadcastExcept(excludeId, message) {
  clients.forEach((client, id) => {
    if (id !== excludeId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 服务器已启动`);
  console.log(`📡 信令服务器: ws://localhost:${PORT}`);
  console.log(`🌐 前端页面: http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log('');
  console.log('使用说明:');
  console.log('1. 打开两个浏览器标签页访问 http://localhost:3000');
  console.log('2. 标签页A点击"拨打电话"');
  console.log('3. 标签页B会收到来电通知（响铃），点击"接听"');
  console.log('4. 双方建立连接，开始通话');
  console.log('5. 任意一方点击"挂断"，双方通话结束');
  console.log('');
});

