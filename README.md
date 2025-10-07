# 音视频学习项目

系统梳理学习音视频领域知识和方案的实践项目。

## 📚 项目结构

```
av-learning/
├── index.html                    # 基础摄像头访问Demo
├── 01-webrtc-1v1-demo/          # WebRTC 1对1视频通话
│   ├── client.html              # 客户端页面
│   ├── server.js                # 信令服务器
│   ├── package.json
│   └── README.md
├── 02-webrtc-mesh-conference/   # Mesh架构多人会议
│   ├── client/                  # 客户端（模块化）
│   ├── server/                  # 服务端（房间管理）
│   └── README.md
└── README.md                     # 本文件
```

## 🎯 学习路径

### 阶段1: WebRTC 基础 ✅

- [x] **基础摄像头访问** (`index.html`)
  - getUserMedia API
  - 本地视频展示
  
- [x] **1对1视频通话** (`01-webrtc-1v1-demo/`)
  - WebRTC P2P 连接
  - 信令服务器（WebSocket）
  - SDP 交换
  - ICE 候选者

### 阶段2: 多人会议 🔄

- [x] **多人视频会议** (`02-webrtc-mesh-conference/`)
  - Mesh 架构实现
  - 多个 PeerConnection 管理
  - 房间概念
  - 模块化代码设计
  
- [ ] **屏幕共享**
  - getDisplayMedia API
  - 多流管理

### 阶段3: 高级特性 📅

- [ ] **弱网优化**
  - 带宽自适应
  - 丢包处理
  - 延迟监控
  
- [ ] **会议录制**
  - MediaRecorder API
  - 服务端录制

### 阶段4: 生产级架构 📅

- [ ] **SFU 架构**
  - mediasoup 集成
  - Simulcast 实现
  
- [ ] **完整会议系统**
  - 用户系统
  - 房间管理
  - 权限控制

## 🚀 快速开始

### 1. 基础摄像头访问

```bash
# 使用任意 HTTP 服务器
npx http-server .
# 访问 http://localhost:8080/index.html
```

### 2. 1对1视频通话

```bash
cd 01-webrtc-1v1-demo
npm install
npm start
# 访问 http://localhost:3000
# 打开两个标签页测试
```

### 3. 多人视频会议

```bash
cd 02-webrtc-mesh-conference/server
npm install
npm start
# 访问 http://localhost:3000
# 打开多个标签页测试（建议 2-4 人）
```

## 📖 核心知识点

### WebRTC 三大组件

1. **getUserMedia**: 获取本地媒体流
2. **RTCPeerConnection**: P2P 连接
3. **RTCDataChannel**: 数据通道

### 架构模式

| 架构 | 适用场景 | 优缺点 |
|------|---------|--------|
| Mesh (P2P) | 2-4人 | 延迟低，带宽压力大 |
| SFU | 5-30人 | 平衡性能，主流方案 |
| MCU | 30+人 | 客户端压力小，服务端成本高 |

### 关键概念

- **信令**: WebSocket 传输控制消息（SDP、ICE）
- **媒体流**: WebRTC 直接 P2P 传输
- **STUN/TURN**: NAT 穿透服务器
- **SDP**: 描述媒体会话
- **ICE**: 交互式连接建立

## 🛠️ 技术栈

- **前端**: 原生 JavaScript (ES6+)
- **后端**: Node.js
- **协议**: WebRTC, WebSocket
- **未来**: React, TypeScript, mediasoup

## 📝 学习笔记

每个子项目都有详细的 README，包含：
- 代码详解
- 核心概念
- 常见问题
- 练习建议

## 🎓 学习资源

- [WebRTC 官方文档](https://webrtc.org/)
- [MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)
- [WebRTC 示例代码](https://webrtc.github.io/samples/)

## 📊 进度追踪

- ✅ 完成基础 Demo
- 🔄 正在进行
- 📅 计划中

---

**学习原则：理论 → 实践 → 总结 → 迭代**

每完成一个项目，总结核心知识点和踩过的坑。

