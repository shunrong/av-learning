# WebRTC 多人视频会议 (Mesh 架构)

基于 WebRTC P2P 的多人视频会议应用，采用 Mesh 架构，支持 2-4 人同时视频通话。

## 🏗️ 项目架构

### 整体架构

```
02-webrtc-mesh-conference/
├── server/                    # 服务端
│   ├── server.js             # 信令服务器
│   ├── RoomManager.js        # 房间管理器
│   └── package.json
└── client/                    # 客户端
    ├── index.html            # 主页面
    ├── styles.css            # 样式
    ├── app.js                # 应用入口
    ├── modules/              # 功能模块
    │   ├── SignalingClient.js     # 信令通信
    │   ├── PeerConnectionManager.js # PC连接池管理
    │   ├── MediaManager.js        # 媒体流管理
    │   ├── RoomClient.js          # 房间客户端（核心协调器）
    │   └── UIController.js        # UI渲染和交互
    └── utils/                # 工具类
        ├── EventEmitter.js   # 事件系统
        └── logger.js         # 日志工具
```

### 设计模式

#### 1. **单一职责原则**
每个类只负责一个明确的功能：
- `SignalingClient`: WebSocket 通信
- `MediaManager`: 媒体流管理
- `PeerConnectionManager`: WebRTC 连接管理
- `RoomClient`: 协调各模块
- `UIController`: UI 渲染

#### 2. **事件驱动架构**
各模块通过事件进行解耦通信：
```javascript
// 发布事件
this.emit('user-joined', data);

// 订阅事件
roomClient.on('user-joined', (data) => {
  // 处理逻辑
});
```

#### 3. **依赖注入**
通过构造函数传入依赖：
```javascript
class RoomClient {
  constructor(signalingUrl) {
    this.signaling = new SignalingClient(signalingUrl);
    this.mediaManager = new MediaManager();
    this.pcManager = new PeerConnectionManager();
  }
}
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 3. 测试多人会议

1. 在浏览器中打开 `http://localhost:3000`
2. 输入相同的房间号，不同的用户名
3. 在多个标签页中重复步骤 1-2
4. 观察多人视频会议效果

## 📚 核心知识点

### 1. Mesh 架构原理

在 Mesh 架构中，每个参与者都与其他所有参与者建立 P2P 连接：

```
4人会议的连接拓扑：

用户A ←→ 用户B
 ↕  ╲  ╱  ↕
用户C ←→ 用户D

每人需要建立 N-1 个连接
总连接数 = N × (N-1) / 2
```

**优点**：
- ✅ 延迟低（P2P 直连）
- ✅ 实现简单
- ✅ 无需媒体服务器

**缺点**：
- ❌ 带宽消耗大（上行 N-1 个流，下行 N-1 个流）
- ❌ CPU 负担重（需要编解码 N-1 个流）
- ❌ 只适合 2-4 人小型会议

### 2. 连接建立流程

```
用户 A (已在房间)          用户 B (新加入)
      │                          │
      │  ← user-joined ─────────┤
      │                          │
      │──── offer ──────────────→│
      │                          │
      │←──── answer ─────────────│
      │                          │
      │←→ ice-candidates ←→      │
      │                          │
      │═══ connected ═══════════ │
```

### 3. PeerConnection 管理

关键挑战：管理多个 PeerConnection 实例

```javascript
// 维护连接池
peerConnections = new Map(); // Map<userId, RTCPeerConnection>

// 为每个用户创建独立的连接
peerConnections.set(userId, new RTCPeerConnection(config));

// 清理连接
peerConnections.get(userId).close();
peerConnections.delete(userId);
```

### 4. 房间管理

服务端维护房间状态：

```javascript
rooms = {
  'room-001': {
    users: [
      { userId: '123', userName: 'Alice', ws: WebSocket },
      { userId: '456', userName: 'Bob', ws: WebSocket }
    ]
  }
}
```

## 🎯 核心功能

### 1. 房间管理
- ✅ 创建/加入房间
- ✅ 用户列表显示
- ✅ 动态加入/离开
- ✅ 自动清理空房间

### 2. 媒体控制
- ✅ 静音/取消静音
- ✅ 关闭/开启视频
- ✅ 本地预览
- ✅ 远程视频显示

### 3. UI 功能
- ✅ 响应式布局（1/2/4人自适应）
- ✅ 视频网格布局
- ✅ 连接状态显示
- ✅ 用户名标签

### 4. 错误处理
- ✅ 连接断开重连
- ✅ 媒体获取失败处理
- ✅ ICE 连接失败处理

## 📊 性能分析

### 带宽消耗（4人会议，720p视频）

| 参与者 | 上行带宽 | 下行带宽 | 总带宽 |
|--------|---------|---------|--------|
| 每人 | 3 Mbps × 3 = 9 Mbps | 3 Mbps × 3 = 9 Mbps | 18 Mbps |
| 总计 | 36 Mbps | 36 Mbps | **72 Mbps** |

**结论**：Mesh 架构不适合 5 人以上的会议。

## 🔄 与 1v1 的区别

| 特性 | 1v1 | 多人 Mesh |
|------|-----|-----------|
| **连接数** | 1 个 | N-1 个 |
| **管理复杂度** | 简单 | 复杂 |
| **房间概念** | 无 | 有 |
| **信令复杂度** | 低 | 中 |
| **带宽消耗** | 低 | 高 |

## 🛠️ 代码亮点

### 1. 事件驱动的模块化设计

```javascript
class SignalingClient extends EventEmitter {
  // 所有通信通过事件通知
  this.emit('user-joined', data);
}

class RoomClient extends EventEmitter {
  // 协调各模块
  this.signaling.on('user-joined', ...);
  this.pcManager.on('remote-track', ...);
}
```

### 2. PeerConnection 状态管理

```javascript
class PeerConnectionManager {
  // 连接池管理
  createPeerConnection(userId, localStream)
  closePeerConnection(userId)
  closeAllConnections()
  
  // 待处理队列
  pendingCandidates = new Map()
}
```

### 3. 资源清理

```javascript
class MediaManager {
  dispose() {
    this.stopLocalMedia();
    this.stopScreenShare();
    this.removeAllListeners();
  }
}
```

## 🐛 调试技巧

### 1. 启用详细日志

```javascript
import { logger } from './utils/logger.js';

// 在 app.js 中设置日志级别
logger.setLevel('DEBUG');
```

### 2. 查看连接统计

```javascript
// 在浏览器控制台
const stats = await app.roomClient.pcManager.getStats(userId);
stats.forEach(report => console.log(report));
```

### 3. 监控连接状态

```javascript
pc.onconnectionstatechange = () => {
  console.log('Connection state:', pc.connectionState);
};

pc.oniceconnectionstatechange = () => {
  console.log('ICE state:', pc.iceConnectionState);
};
```

## 📈 扩展方向

### 1. 屏幕共享
```javascript
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
});

// 替换视频轨道
sender.replaceTrack(screenStream.getVideoTracks()[0]);
```

### 2. DataChannel 聊天
```javascript
const dataChannel = pc.createDataChannel('chat');
dataChannel.send(JSON.stringify({ text: '你好' }));
```

### 3. 会议录制
```javascript
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.start();
```

### 4. SFU 架构升级
当参与人数超过 4 人时，应考虑升级到 SFU 架构（如 mediasoup）。

## 🎓 学习要点

### 必须掌握
1. ✅ Mesh 架构的优缺点
2. ✅ 多 PeerConnection 管理
3. ✅ 房间概念和状态管理
4. ✅ 事件驱动架构
5. ✅ 模块化设计模式

### 深入理解
1. 🔍 ICE 候选者收集和连接检查
2. 🔍 SDP 协商过程
3. 🔍 媒体轨道管理
4. 🔍 错误处理和重连机制

### 性能优化
1. 🚀 带宽自适应
2. 🚀 动态分辨率调整
3. 🚀 连接质量监控

## 📝 常见问题

### Q1: 为什么新用户加入时，主动发起 Offer？
**A**: 避免双方同时发送 Offer 导致的"Glare"冲突。我们采用"新人主动"策略。

### Q2: 为什么需要 `pendingCandidates` 队列？
**A**: ICE 候选者可能在 `setRemoteDescription` 之前到达，需要缓存等待。

### Q3: Mesh 最多支持多少人？
**A**: 理论上无限，但实际受带宽和 CPU 限制，建议不超过 4 人。

### Q4: 如何调试连接失败？
**A**: 
1. 检查 STUN 服务器是否可用
2. 查看浏览器控制台的 ICE 状态
3. 使用 `chrome://webrtc-internals/` 查看详细信息

## 🔗 相关资源

- [WebRTC 官方文档](https://webrtc.org/)
- [MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)
- [01-webrtc-1v1-demo](../01-webrtc-1v1-demo/) - 前置项目

---

**下一步**: 实现 SFU 架构 (`03-webrtc-sfu/`)，支持更多人的会议。

