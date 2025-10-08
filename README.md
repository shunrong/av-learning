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
├── 03-live-streaming-basic/     # 直播基础（RTMP + FLV）
│   ├── server/                  # Node.js 流媒体服务器
│   ├── client/                  # 播放器页面
│   ├── scripts/                 # 推流脚本
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

### 阶段2: 多人会议 ✅

- [x] **多人视频会议** (`02-webrtc-mesh-conference/`)
  - Mesh 架构实现
  - 多个 PeerConnection 管理
  - 房间概念
  - 模块化代码设计
  
- [ ] **屏幕共享**
  - getDisplayMedia API
  - 多流管理

### 阶段3: 直播技术 🔄

- [x] **直播基础** (`03-live-streaming-basic/`)
  - RTMP 推流协议
  - HTTP-FLV 拉流播放
  - FFmpeg 推流工具
  - flv.js 播放器
  - 延迟原理理解

- [ ] **HLS 直播**
  - TS 切片机制
  - m3u8 索引文件
  - 自适应码率（ABR）
  
- [ ] **低延迟直播**
  - WebRTC 直播方案
  - SRT 协议
  - 协议对比与选型

### 阶段4: WebRTC 高级特性 📅

- [ ] **弱网优化**
  - 带宽自适应
  - 丢包处理
  - 延迟监控
  
- [ ] **会议录制**
  - MediaRecorder API
  - 服务端录制

### 阶段5: 生产级架构 📅

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

### 4. 直播系统

```bash
# 安装 FFmpeg（推流工具）
brew install ffmpeg

# 启动服务器
cd 03-live-streaming-basic
npm install
npm start

# 新开终端，推流测试
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://localhost:1935/live/stream

# 访问 http://localhost:3000/player.html
```

## 📖 核心知识点

### WebRTC 三大组件

1. **getUserMedia**: 获取本地媒体流
2. **RTCPeerConnection**: P2P 连接
3. **RTCDataChannel**: 数据通道

### 架构模式对比

| 架构 | 适用场景 | 优缺点 |
|------|---------|--------|
| Mesh (P2P) | 2-4人 | 延迟低，带宽压力大 |
| SFU | 5-30人 | 平衡性能，主流方案 |
| MCU | 30+人 | 客户端压力小，服务端成本高 |

### WebRTC vs 直播

| 维度 | WebRTC | 传统直播 |
|------|--------|---------|
| 延迟 | <500ms | 3-30秒 |
| 场景 | 双向互动 | 单向广播 |
| 观众数 | 受限 | 海量 |
| 协议 | UDP/RTP | RTMP/HTTP |

### 直播核心概念

- **推流**: 主播端采集、编码、传输（RTMP、SRT、WebRTC）
- **拉流**: 观众端请求、解码、播放（HTTP-FLV、HLS、RTSP）
- **编码**: H.264/H.265/VP8/VP9
- **封装**: FLV、TS、MP4
- **FFmpeg**: 音视频处理的瑞士军刀

### WebRTC 关键概念

- **信令**: WebSocket 传输控制消息（SDP、ICE）
- **媒体流**: WebRTC 直接 P2P 传输
- **STUN/TURN**: NAT 穿透服务器
- **SDP**: 描述媒体会话
- **ICE**: 交互式连接建立

## 🛠️ 技术栈

### WebRTC 实时通信
- **前端**: 原生 JavaScript (ES6+)
- **后端**: Node.js + WebSocket
- **协议**: WebRTC (SRTP/SCTP)
- **未来**: React, TypeScript, mediasoup

### 直播系统
- **流媒体服务器**: Node.js + node-media-server
- **推流工具**: FFmpeg
- **播放器**: flv.js / hls.js
- **协议**: RTMP (推流) + HTTP-FLV/HLS (拉流)
- **编码**: H.264 (视频) + AAC (音频)

## 📝 学习笔记

每个子项目都有详细的 README，包含：
- 代码详解
- 核心概念
- 常见问题
- 练习建议

## 🎓 学习资源

### WebRTC
- [WebRTC 官方文档](https://webrtc.org/)
- [MDN WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)
- [WebRTC 示例代码](https://webrtc.github.io/samples/)

### 直播技术
- [FFmpeg 官方文档](https://ffmpeg.org/documentation.html)
- [flv.js GitHub](https://github.com/bilibili/flv.js)
- [RTMP 协议规范](https://rtmp.veriskope.com/docs/spec/)
- [雷霄骅的博客](https://blog.csdn.net/leixiaohua1020) - 音视频技术

## 📊 进度追踪

- ✅ 完成基础 Demo
- 🔄 正在进行
- 📅 计划中

---

**学习原则：理论 → 实践 → 总结 → 迭代**

每完成一个项目，总结核心知识点和踩过的坑。

