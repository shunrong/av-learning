/**
 * WebRTC 信令服务器
 * 负责房间管理和信令消息转发
 */

const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const RoomManager = require('./RoomManager');

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager();

// 创建 HTTP 服务器（用于提供静态文件）
const server = http.createServer((req, res) => {
  // 处理静态文件请求
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, '../client', filePath);

  const extname = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  };

  const contentType = contentTypes[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

console.log(`\n🚀 信令服务器启动在端口 ${PORT}`);
console.log(`📱 客户端访问地址: http://localhost:${PORT}\n`);

// WebSocket 连接处理
wss.on('connection', (ws) => {
  const userId = Date.now().toString();
  console.log(`\n➕ 新客户端连接: ${userId}`);

  // 处理消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, userId, message);
    } catch (error) {
      console.error('❌ 消息解析错误:', error);
      sendError(ws, '消息格式错误');
    }
  });

  // 处理断开连接
  ws.on('close', () => {
    console.log(`\n➖ 客户端断开: ${userId}`);
    handleUserDisconnect(userId);
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error(`❌ WebSocket 错误 (${userId}):`, error.message);
  });
});

/**
 * 处理收到的消息
 */
function handleMessage(ws, userId, message) {
  const { type, ...data } = message;
  
  console.log(`📨 收到消息 [${type}] from ${userId}`);

  switch (type) {
    case 'join-room':
      handleJoinRoom(ws, userId, data);
      break;

    case 'leave-room':
      handleLeaveRoom(userId);
      break;

    case 'offer':
      handleOffer(userId, data);
      break;

    case 'answer':
      handleAnswer(userId, data);
      break;

    case 'ice-candidate':
      handleIceCandidate(userId, data);
      break;

    default:
      console.log(`⚠️  未知消息类型: ${type}`);
      sendError(ws, '未知消息类型');
  }
}

/**
 * 处理加入房间
 */
function handleJoinRoom(ws, userId, data) {
  const { roomId, userName } = data;

  if (!roomId || !userName) {
    sendError(ws, '房间号和用户名不能为空');
    return;
  }

  try {
    // 加入房间
    const { room, existingUsers } = roomManager.joinRoom(
      roomId,
      userId,
      userName,
      ws
    );

    // 通知用户加入成功
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      userId,
      userName,
      users: existingUsers.concat([{ userId, userName }])
    }));

    // 通知房间内其他用户
    roomManager.broadcastToRoom(roomId, userId, {
      type: 'user-joined',
      userId,
      userName
    });

    // 打印统计信息
    roomManager.printStats();
  } catch (error) {
    console.error('❌ 加入房间失败:', error);
    sendError(ws, '加入房间失败');
  }
}

/**
 * 处理离开房间
 */
function handleLeaveRoom(userId) {
  const result = roomManager.leaveRoom(userId);
  
  if (result) {
    const { roomId, user } = result;
    
    // 通知房间内其他用户
    roomManager.broadcastToRoom(roomId, userId, {
      type: 'user-left',
      userId,
      userName: user?.userName
    });

    roomManager.printStats();
  }
}

/**
 * 处理用户断开连接
 */
function handleUserDisconnect(userId) {
  handleLeaveRoom(userId);
}

/**
 * 处理 Offer
 */
function handleOffer(senderId, data) {
  const { targetUserId, offer } = data;

  if (!targetUserId || !offer) {
    console.error('❌ Offer 格式错误');
    return;
  }

  console.log(`📤 转发 Offer: ${senderId} -> ${targetUserId}`);

  // 转发给目标用户
  roomManager.sendToUser(targetUserId, {
    type: 'offer',
    userId: senderId,
    offer
  });
}

/**
 * 处理 Answer
 */
function handleAnswer(senderId, data) {
  const { targetUserId, answer } = data;

  if (!targetUserId || !answer) {
    console.error('❌ Answer 格式错误');
    return;
  }

  console.log(`📤 转发 Answer: ${senderId} -> ${targetUserId}`);

  // 转发给目标用户
  roomManager.sendToUser(targetUserId, {
    type: 'answer',
    userId: senderId,
    answer
  });
}

/**
 * 处理 ICE Candidate
 */
function handleIceCandidate(senderId, data) {
  const { targetUserId, candidate } = data;

  if (!targetUserId || !candidate) {
    console.error('❌ ICE Candidate 格式错误');
    return;
  }

  // 转发给目标用户
  roomManager.sendToUser(targetUserId, {
    type: 'ice-candidate',
    userId: senderId,
    candidate
  });
}

/**
 * 发送错误消息
 */
function sendError(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      message
    }));
  }
}

// 定期打印统计信息（可选）
setInterval(() => {
  const stats = roomManager.getStats();
  if (stats.totalRooms > 0) {
    console.log(`\n📊 当前状态: ${stats.totalRooms} 个房间, ${stats.totalUsers} 个用户在线`);
  }
}, 60000); // 每分钟

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n👋 服务器正在关闭...');
  wss.close(() => {
    console.log('✅ WebSocket 服务器已关闭');
    process.exit(0);
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`✅ HTTP 服务器运行在 http://localhost:${PORT}`);
  console.log(`✅ WebSocket 服务器运行在 ws://localhost:${PORT}`);
  console.log('\n💡 在浏览器中打开多个标签页测试多人会议\n');
});

