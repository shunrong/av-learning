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
├── 03-live-streaming-basic/     # 直播基础（RTMP + HTTP-FLV）
│   ├── server/                  # Node.js 流媒体服务器
│   ├── client/                  # 播放器页面
│   ├── publisher/               # 推流客户端
│   ├── 直播技术演进史与协议详解.md  # 深度理论文档 ⭐
│   ├── 直播技术实战指南.md          # 实战经验文档 ⭐
│   ├── 主流直播平台架构分析.md      # 平台架构分析 ⭐
│   └── README.md
├── 04-hls-live-streaming/       # HLS 直播系统
│   ├── server/                  # HLS服务器
│   ├── client/                  # 播放器
│   └── README.md
├── 05-vod-system/               # 视频点播系统 ⭐ NEW
│   ├── server/                  # 上传、转码、存储服务
│   ├── client/                  # 视频列表、播放器
│   ├── media/                   # 媒体文件存储
│   ├── 点播技术详解.md          # 点播技术深度解析 ⭐
│   ├── 点播与直播对比.md        # VOD vs Live 全面对比 ⭐
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

### 阶段3: 直播技术 🔥

- [x] **直播基础** (`03-live-streaming-basic/`) ✅
  - RTMP 推流协议
  - HTTP-FLV 拉流播放
  - FFmpeg 推流工具
  - flv.js 播放器
  - 延迟原理理解
  - 📚 包含深度理论文档和平台架构分析

- [x] **HLS 直播** (`04-hls-live-streaming/`) ✅
  - TS 切片机制
  - m3u8 索引文件
  - 多码率转码
  - 自适应码率（ABR）
  - HTTP-FLV vs HLS 对比
  - LL-HLS 低延迟优化

### 阶段4: 视频点播技术 🆕

- [x] **视频点播系统** (`05-vod-system/`) ✅ 🔥
  - 视频上传与文件管理
  - FFmpeg 自动转码
  - HLS 切片生成
  - 缩略图自动生成
  - 多格式播放支持
  - 完整的点播系统实现
  - 📚 包含点播技术详解和与直播的对比分析
  
### 阶段5: 混合架构与实时通信 📅

- [ ] **WebRTC 直播** (`06-webrtc-live/`) 📅
  - WebRTC 推拉流（<500ms）
  - SFU 架构实现
  - 连麦互动
  - 协议对比与选型

### 阶段6: WebRTC 高级特性 📅

- [ ] **弱网优化**
  - 带宽自适应
  - 丢包处理
  - 延迟监控
  
- [ ] **会议录制**
  - MediaRecorder API
  - 服务端录制

### 阶段7: 生产级架构 📅

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

### 5. 视频点播系统 🆕

```bash
# 确保已安装 FFmpeg
brew install ffmpeg

# 启动服务器
cd 05-vod-system
npm install
npm start

# 访问 http://localhost:3000
# 上传视频后系统自动转码为HLS格式
```

## 📚 深度学习文档

项目包含系统的理论文档和实战指南，**强烈推荐阅读**：

### 🔥 核心理论文档（03 项目）

#### 1. [直播技术演进史与协议详解](./03-live-streaming-basic/直播技术演进史与协议详解.md) ⭐⭐⭐
**15,000 字深度解析 — 系统理解直播技术的设计哲学**
- 📖 直播技术演进历史（RTSP → RTMP → HLS → WebRTC）
- 🔍 RTMP 协议深度解析（握手、Chunk、音视频格式）
- 🚀 SRT 协议详解（ARQ、FEC、自适应）
- 📡 WebRTC 推流原理（SDP、ICE、RTP/RTCP）
- 🎬 HTTP-FLV 详解（FLV 格式、MSE API、flv.js 原理）
- 📺 HLS 详解（m3u8、TS 格式、LL-HLS）
- 🎯 协议对比与技术选型决策树
- 💰 混合架构方案与成本分析

**适合**：理解直播技术为什么这样设计，掌握协议原理和设计思路

---

#### 2. [直播技术实战指南](./03-live-streaming-basic/直播技术实战指南.md) ⭐⭐⭐
**20,000 字实战经验 — 从数据流转到性能优化的完整指南**
- 🎥 完整数据流转过程（采集 → 编码 → 推流 → 服务器 → 拉流 → 播放）
- ⚡ 延迟优化实战（GOP、编码参数、缓冲、追帧）
- 📊 性能监控与指标（服务器、客户端、自动降级）
- 🔧 常见问题排查（花屏、音画不同步、卡顿、启动慢）
- 🏗️ 架构设计实战（小型、中型、大型直播架构）
- 💵 成本分析与优化策略

**适合**：学习实战经验，掌握性能优化和问题排查方法

---

#### 3. [主流直播平台架构分析](./03-live-streaming-basic/主流直播平台架构分析.md) ⭐⭐⭐
**深入分析真实架构 — 了解一线大厂的技术选型**
- 🎵 **抖音直播**：QUIC 推流、火山引擎 CDN、AI 美颜/审核
- 📺 **B站直播**：HTTP-FLV 主推、弹幕同步、多协议接入
- 🎮 **斗鱼/虎牙**：游戏场景优化、60fps 支持、高码率方案
- 🎬 **快手直播**：秒开优化、下沉市场、短视频基因
- 🔍 技术选型对比与成本分析

**适合**：了解真实业务场景的技术选型和架构设计

---

### 🎥 点播技术文档（05 项目）

#### 1. [点播技术详解](./05-vod-system/点播技术详解.md) ⭐⭐⭐
**深入理解视频点播的核心技术和实现方式**
- 📖 点播 vs 直播的本质区别
- 🏗️ 完整的点播系统架构（上传、转码、存储、分发）
- 🎬 视频编码基础（H.264/H.265/VP9/AV1）
- 🔧 FFmpeg 转码详解（命令详解、多码率、硬件加速）
- 📡 HLS 技术深入（M3U8格式、自适应码率）
- 💾 存储策略（本地、OSS、分布式）
- 🎮 前端播放器实现（hls.js、Video.js）
- ⚡ 性能优化策略
- 🔒 安全措施（防盗链、HLS加密）

#### 2. [点播与直播对比](./05-vod-system/点播与直播对比.md) ⭐⭐⭐
**全方位对比点播和直播技术的差异**
- 🎯 核心差异对比表
- 🏗️ 架构对比分析
- 📊 协议选择指南
- 🔧 转码策略差异
- 💾 存储策略对比
- 💰 成本结构分析
- 🎮 应用场景选择
- 🚀 技术演进路线

**适合**：理解点播和直播的本质区别，做出正确的技术选型

---

### 📅 学习建议

**快速上手**（1-2 周）：
1. ✅ 先跑通 03 项目 Demo
2. 📖 阅读工具文档（FFmpeg、flv.js）
3. 🎯 理解基本概念

**深入理论**（2-4 周）⭐ **强烈推荐**：
1. 📚 阅读《直播技术演进史与协议详解》（理解为什么）
2. 🔧 阅读《直播技术实战指南》（学习怎么做）
3. 🏢 阅读《主流直播平台架构分析》（对比真实方案）
4. 🔬 配合 Wireshark 抓包实践

**进阶实战**（1-3 个月）：
1. 🚀 实现 04 HLS 项目
2. 📊 对比 HTTP-FLV vs HLS
3. ⚡ 研究 LL-HLS 低延迟优化
4. 🎯 实现 05 点播系统

**点播技术学习**（2-3 周）🆕：
1. ✅ 跑通 05 项目（上传、转码、播放）
2. 📖 阅读《点播技术详解》（理解点播核心技术）
3. 📊 阅读《点播与直播对比》（理解选型依据）
4. 🔧 实践 FFmpeg 转码命令
5. 🚀 尝试对接 OSS 存储

---

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

