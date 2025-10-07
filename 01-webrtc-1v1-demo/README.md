# WebRTC 1v1 视频通话 - 最小可用Demo

这是一个使用原生 JavaScript 实现的 WebRTC 1对1视频通话系统，代码简洁清晰，适合学习 WebRTC 基础原理。

## 📁 项目结构

```
01-webrtc-1v1-demo/
├── client.html      # 前端页面（包含所有客户端逻辑）
├── server.js        # Node.js 信令服务器
├── package.json     # 依赖配置
└── README.md        # 本文件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 3. 测试视频通话（真实场景）

**完整的呼叫-接听流程：**

1. **打开两个浏览器标签页**（或两个不同的浏览器）
2. 都访问 `http://localhost:3000`
3. **标签页A**：点击 **"拨打电话"** 按钮
   - 允许摄像头和麦克风权限
   - 显示"等待对方接听..."
4. **标签页B**：收到来电通知（会响铃 🔔）
   - 显示来电弹窗
   - 点击 **"接听"** 按钮（或点击"拒绝"拒绝来电）
   - 允许摄像头和麦克风权限
5. 连接建立成功（约 2-5 秒）
6. 双方开始视频通话 🎥
7. **任意一方点击"挂断"**，双方通话同时结束

## 📚 核心概念

### 1. 信令服务器（server.js）

- 使用 WebSocket 进行实时通信
- 作用：转发 offer、answer、ICE candidate
- **不传输**音视频数据（音视频通过 WebRTC P2P 传输）

### 2. 客户端（client.html）

真实视频通话流程（类似微信/FaceTime）：

```
发起方（A）                        被叫方（B）
────────────────────────────────────────────────
📱 页面加载                        📱 页面加载
   ↓                                  ↓
🔌 连接信令服务器                   🔌 连接信令服务器
   ↓                                  ↓
🟢 显示"拨打电话"按钮                🟢 显示"拨打电话"按钮
   ↓                                  ↓
👆 点击"拨打电话"                     💤 等待状态
   ↓                                  ↓
🎥 获取摄像头/麦克风                   📞 收到来电通知
   ↓                                  🔔 播放铃声
✅ 显示本地视频                       [接听] [拒绝]
   ↓                                  ↓
📡 发送 call-request                 👆 点击"接听"
   ↓                                  ↓
⏰ 等待对方接听...                   🎥 获取摄像头/麦克风
   ↓                                  ↓
✅ 收到 call-accepted                ✅ 显示本地视频
   ↓                                  ↓
🤝 创建 PeerConnection    ←──────→  🤝 创建 PeerConnection
   ↓                                  ↓
📡 交换 SDP (offer/answer) ←──────→  📡 交换 SDP
   ↓                                  ↓
🌐 交换 ICE candidates     ←──────→  🌐 交换 ICE candidates
   ↓                                  ↓
🔗 WebRTC P2P 连接建立    ←──────→  🔗 连接建立
   ↓                                  ↓
🎬 显示对方视频                       🎬 显示对方视频
   ↓                                  ↓
💬 通话中...                         💬 通话中...
   ↓                                  ↓
👆 点击"挂断"          ──通知──→    ❌ 收到 call-ended
   ↓                                  ↓
🛑 停止流 + 关闭连接                  🛑 停止流 + 关闭连接
   ↓                                  ↓
🔄 回到空闲状态                       🔄 回到空闲状态
```

**关键信令消息：**

| 消息类型 | 发送方 | 接收方 | 说明 |
|---------|-------|--------|------|
| `call-request` | 发起方A | 被叫方B | A 发起呼叫 |
| `call-accepted` | 被叫方B | 发起方A | B 接听电话 |
| `call-rejected` | 被叫方B | 发起方A | B 拒绝电话 |
| `call-ended` | 任意一方 | 对方 | 挂断通话 |
| `offer` | 先创建的一方 | 对方 | SDP offer |
| `answer` | 后创建的一方 | 对方 | SDP answer |
| `ice-candidate` | 双方 | 对方 | ICE 候选者 |
```

### 3. 真实通话场景的关键特性

**与会议室模式的本质区别：**

| 特性 | 会议室模式 | 真实通话模式（当前版本） |
|------|----------|---------------------|
| **发起方式** | 双方各自"加入" | 一方"拨打"，一方"接听" |
| **来电通知** | 无 | ✅ 弹窗 + 铃声 |
| **接听/拒绝** | 无 | ✅ 可以接听或拒绝 |
| **挂断行为** | 只影响自己 | ✅ 双方同时结束 |
| **状态同步** | 弱 | ✅ 强同步（呼叫中/响铃/通话中） |
| **用户体验** | 像腾讯会议 | ✅ 像微信视频/FaceTime |

**核心改进：**

1. ✅ **呼叫-接听模式**：真实的通话发起流程
2. ✅ **来电通知**：弹窗提示 + 响铃效果
3. ✅ **接听/拒绝**：被叫方可以选择接听或拒绝
4. ✅ **双向挂断**：任意一方挂断，双方都结束通话
5. ✅ **状态管理**：idle → calling → ringing → connected
6. ✅ **资源同步清理**：挂断时双方都清理资源

## 🔍 代码详解

### 关键函数

#### 1. 发起呼叫 (callBtn.onclick)

```javascript
// 点击"拨打电话"按钮的完整流程
callBtn.onclick = async () => {
  // 1. 检查对方是否在线
  if (userCount < 2) {
    alert('对方不在线，无法拨打');
    return;
  }
  
  // 2. 获取摄像头和麦克风
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true
  });
  
  // 3. 显示本地视频
  localVideo.srcObject = localStream;
  
  // 4. 发送呼叫请求
  ws.send(JSON.stringify({
    type: 'call-request',
    from: clientId
  }));
  
  // 5. 更新状态为"呼叫中"
  callState = 'calling';
  updateStatus('callStatus', '呼叫中...', false);
  
  // 6. 等待对方接听...
};
```

#### 2. 接听电话 (acceptBtn.onclick)

```javascript
// 点击"接听"按钮
acceptBtn.onclick = async () => {
  // 1. 停止铃声
  ringtone.pause();
  
  // 2. 隐藏来电通知
  incomingCallEl.classList.remove('show');
  
  // 3. 获取本地媒体流
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  
  // 4. 通知对方"已接听"
  ws.send(JSON.stringify({
    type: 'call-accepted',
    from: clientId
  }));
  
  // 5. 创建 PeerConnection，开始建立连接
  await createPeerConnection();
  await createOffer();  // 被叫方创建 offer
};
```

#### 3. 拒绝电话 (rejectBtn.onclick)

```javascript
// 点击"拒绝"按钮
rejectBtn.onclick = () => {
  // 1. 停止铃声
  ringtone.pause();
  
  // 2. 隐藏来电通知
  incomingCallEl.classList.remove('show');
  
  // 3. 通知对方"被拒绝"
  ws.send(JSON.stringify({
    type: 'call-rejected',
    from: clientId
  }));
  
  // 4. 回到空闲状态
  callState = 'idle';
};
```

#### 4. 挂断电话 (hangupBtn.onclick)

```javascript
// 点击"挂断"按钮
hangupBtn.onclick = () => {
  // 1. 通知对方"挂断了"（关键！）
  ws.send(JSON.stringify({
    type: 'call-ended',
    from: clientId
  }));
  
  // 2. 本地执行清理
  endCall();
};

function endCall() {
  // 1. 停止本地流（关闭摄像头和麦克风）
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
    localVideo.srcObject = null;
  }
  
  // 2. 关闭 PeerConnection
  if (pc) {
    pc.close();
    pc = null;
  }
  
  // 3. 清空远程视频
  remoteVideo.srcObject = null;
  
  // 4. 恢复UI到初始状态
  resetToIdle();
  
  // ✓ 完全清理，可以重新拨打
}
```

#### 5. 处理对方挂断 (handleSignalingMessage)

```javascript
// 收到对方挂断的消息
case 'call-ended':
  log('✗ 对方已挂断');
  alert('对方已挂断');
  
  // 自动执行本地清理（不需要再通知对方）
  endCall();
  break;
```


### 核心 WebRTC API

```javascript
// 1. 获取本地媒体流
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// 2. 创建 PeerConnection
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 3. 添加本地流
stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
});

// 4. 创建 offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// 5. 接收远程流
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

// 6. 停止流（重要！）
stream.getTracks().forEach(track => track.stop());
```

### 信令消息类型

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `connected` | 服务器 → 客户端 | 连接成功，返回客户端ID |
| `user-count` | 服务器 → 客户端 | 通知在线人数变化 |
| `offer` | 客户端A → 服务器 → 客户端B | SDP offer |
| `answer` | 客户端B → 服务器 → 客户端A | SDP answer |
| `ice-candidate` | 双向 | ICE 候选者 |
| `user-left` | 服务器 → 客户端 | 通知对方离开 |

## 🐛 常见问题

### 1. 无法访问摄像头

**原因：** 浏览器安全策略要求 HTTPS 或 localhost

**解决：** 确保使用 `http://localhost:3000` 访问（不要用 IP 地址）

### 2. 看不到对方视频

**排查步骤：**
1. 打开浏览器控制台，查看日志
2. 检查 WebSocket 连接状态
3. 检查 ICE 连接状态
4. 确保两个标签页都允许了摄像头权限

### 3. 连接建立很慢

**可能原因：**
- ICE 候选者收集需要时间
- 防火墙/路由器限制

**优化：** 使用 TURN 服务器（生产环境必需）

## 🎓 学习要点

### 完成 Demo 后你应该理解：

✅ WebRTC 的基本工作流程  
✅ 信令服务器的作用（只转发控制消息）  
✅ SDP 的作用（描述媒体会话）  
✅ ICE 的作用（NAT 穿透）  
✅ 本地流和远程流的区别  
✅ 为什么本地视频要 `muted`（避免回声）  

### 下一步学习方向

1. **多人会议**：实现 4 人视频会议（理解 Mesh 架构）
2. **屏幕共享**：添加 `getDisplayMedia()` 功能
3. **数据通道**：使用 `RTCDataChannel` 发送文字消息
4. **弱网优化**：监控网络状态，动态调整码率
5. **SFU 架构**：学习使用 mediasoup 等媒体服务器

## 🔧 技术栈

- **前端**: 原生 HTML/CSS/JavaScript (ES6+)
- **后端**: Node.js + ws (WebSocket)
- **协议**: WebRTC + WebSocket

## 📝 代码注释

代码中包含详细的中文注释，每个关键步骤都有说明。建议：

1. 先运行起来，看效果
2. 打开浏览器控制台，看日志输出
3. 对照日志理解代码流程
4. 尝试修改代码，加深理解

## 🌟 练习建议

1. **查看网络请求**：打开 Chrome DevTools → Network → WS，查看 WebSocket 消息
2. **查看 WebRTC 状态**：访问 `chrome://webrtc-internals/`，查看详细连接信息
3. **修改代码**：尝试添加"挂断"按钮，关闭连接
4. **添加功能**：实现"切换摄像头"功能（前后摄像头）

## 📖 相关资源

- [WebRTC 官方文档](https://webrtc.org/)
- [MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)
- [Google WebRTC 示例](https://webrtc.github.io/samples/)

## 🐛 遇到问题？

检查清单：
- [ ] Node.js 版本 >= 14
- [ ] 使用 Chrome/Edge/Firefox 浏览器
- [ ] 使用 localhost 而非 IP 地址
- [ ] 允许了摄像头和麦克风权限
- [ ] 两个标签页都打开了

---

**Happy Coding! 🎉**

有问题欢迎提 Issue 或查看控制台日志进行调试。

