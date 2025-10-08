# 03-live-streaming-basic - Node.js 直播基础

纯 Node.js 实现的直播系统，适合前端开发者学习直播技术。

## 📚 你将学到

- RTMP 推流协议的实际应用
- HTTP-FLV 拉流播放原理
- FFmpeg 基础使用
- 直播延迟的产生原因
- flv.js 播放器使用

## 🏗️ 系统架构

```
推流端 (FFmpeg) → RTMP协议 → Node.js服务器 → HTTP-FLV → 播放器 (flv.js)
                  (端口1935)                    (端口8080)
```

**核心流程**：
1. 主播用 FFmpeg 把视频推到 RTMP 服务器（端口 1935）
2. 服务器接收流，通过 HTTP-FLV 协议提供给观众（端口 8080）
3. 观众用浏览器（flv.js）播放 HTTP-FLV 流

## 🚀 快速开始

### 方式1：使用推流客户端（推荐）⭐

这是实际业务场景的使用方式，主播不需要敲命令行。

#### 1. 启动流媒体服务器

```bash
cd 03-live-streaming-basic
npm install
npm start
```

#### 2. 启动推流客户端

新开终端：
```bash
cd publisher
npm install
npm start
```

#### 3. 使用推流客户端

- 打开推流控制面板：`http://localhost:3002`
- 配置推流参数（摄像头或视频文件）
- 点击"开始推流"
- 实时查看统计信息

#### 4. 观看直播

打开播放器：`http://localhost:3001/player.html`

---

### 方式2：命令行推流（学习测试用）

你会看到：
```
╔═══════════════════════════════════════════════════════╗
║        🎥  Node.js 直播服务器启动成功！               ║
╚═══════════════════════════════════════════════════════╝

📌 服务信息：
   RTMP 推流端口: 1935
   HTTP 服务端口: 8080

🌐 网页服务器: http://localhost:3000
   首页: http://localhost:3000/index.html
   播放器: http://localhost:3000/player.html
```

### 3. 推流（3种方式任选其一）

#### 方式A：用测试视频推流（最简单，推荐）

```bash
# 1. 先安装 FFmpeg
brew install ffmpeg

# 2. 准备一个测试视频文件（任意 mp4）
# 把它重命名为 test.mp4，放到项目根目录

# 3. 推流
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://localhost:1935/live/stream
```

看到这样的输出就说明推流成功了：
```
Stream mapping:
  Stream #0:0 -> #0:0 (copy)
  Stream #0:1 -> #0:1 (copy)
frame=  123 fps= 30 q=-1.0 size=    1024kB time=00:00:04.10 bitrate=2044.3kbits/s
```

#### 方式B：用摄像头推流（体验实时延迟）

```bash
# Mac 摄像头推流
ffmpeg -f avfoundation -framerate 30 -i "0:0" \
  -c:v libx264 -preset ultrafast \
  -c:a aac -f flv rtmp://localhost:1935/live/stream
```

#### 方式C：使用推流脚本

```bash
# 如果你已经准备好 test.mp4
npm run push
```

### 4. 播放

打开浏览器访问：`http://localhost:3000/player.html`

点击"开始播放"，等待 3-5 秒，你就能看到直播画面了！

## 📖 核心概念详解

### 推流地址格式

```
rtmp://localhost:1935/live/stream
        ↓          ↓    ↓      ↓
     服务器      端口  应用名  流名称

- localhost: 服务器地址（本机）
- 1935: RTMP 默认端口
- live: 应用名（可以自定义，如 "show"、"game"）
- stream: 流名称（可以自定义，如 "room001"）
```

### 播放地址格式

```
HTTP-FLV: http://localhost:8080/live/stream.flv
                                  ↓      ↓
                              应用名   流名称（要和推流地址对应）
```

### RTMP vs HTTP-FLV

- **RTMP**：推流协议，基于 TCP，适合上传
- **HTTP-FLV**：拉流协议，基于 HTTP，适合分发给大量观众
- **为什么分开**：推流注重实时性，拉流注重扩展性和 CDN 友好

### 延迟说明

HTTP-FLV 延迟通常在 **3-5 秒**，来源：
1. **编码延迟**：视频编码需要时间（GOP 大小影响）
2. **网络传输**：数据在网络中传输
3. **缓冲延迟**：播放器缓冲区（为了流畅播放）

对比 WebRTC（<500ms），延迟高但成本低，适合大规模直播。

## 🔧 FFmpeg 是什么？

**FFmpeg 是音视频处理的命令行工具**，不是编程语言，是一个可执行程序。

### 安装

```bash
# Mac
brew install ffmpeg

# 验证安装
ffmpeg -version
```

### 常用命令

```bash
# 1. 推流
ffmpeg -re -i input.mp4 -f flv rtmp://server/live/stream

# 2. 转码
ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4

# 3. 提取音频
ffmpeg -i video.mp4 -vn -c:a copy audio.aac

# 4. 查看流信息
ffprobe rtmp://localhost:1935/live/stream

# 5. 录制直播流
ffmpeg -i rtmp://server/live/stream -c copy output.mp4

# 6. Mac 摄像头推流
ffmpeg -f avfoundation -i "0:0" -f flv rtmp://server/live/stream
#                          ↑ ↑
#                      视频 音频设备索引

# 查看可用设备
ffmpeg -f avfoundation -list_devices true -i ""
```

### FFmpeg 参数说明

```bash
ffmpeg -re -i test.mp4 -c:v libx264 -c:a aac -f flv rtmp://server/live
       ↓   ↓           ↓             ↓         ↓
      按   输入        视频编码      音频编码  输出格式
    实时   文件        H.264         AAC       FLV
    速度
```

## 🎮 实验建议

### 1. 体验延迟

1. 用摄像头推流（方式B）
2. 对着镜头挥手或看秒表
3. 观察播放器里的延迟（通常 3-5 秒）

### 2. 多个观众

同时打开 3-5 个浏览器标签页播放 `player.html`，观察：
- 所有观众看到的画面是同步的
- 服务器终端显示多个 "[观众加入]" 日志
- 这就是直播的"广播"特性

### 3. 对比 WebRTC

| 维度 | WebRTC (你之前的项目) | 直播 (当前项目) |
|------|---------------------|----------------|
| 延迟 | <500ms | 3-5秒 |
| 观众数 | 受限（Mesh 架构） | 无限（CDN 分发） |
| 推流 | 浏览器 getUserMedia | FFmpeg/OBS |
| 拉流 | RTCPeerConnection | HTTP |
| 适用场景 | 双向互动 | 单向广播 |

### 4. 修改流名称

试试自定义流名称：

```bash
# 推流到 "myroom" 流
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://localhost:1935/live/myroom

# 播放时修改地址为
http://localhost:8080/live/myroom.flv
```

## 📂 项目结构

```
03-live-streaming-basic/
├── package.json           # 项目配置
├── README.md             # 本文件
├── server/
│   └── server.js         # Node.js 流媒体服务器
├── client/
│   ├── index.html        # 首页导航
│   └── player.html       # 播放页面
└── scripts/
    └── push-test.sh      # FFmpeg 推流脚本
```

## 🐛 常见问题

### 1. 推流后播放器黑屏？

**原因**：
- 推流未成功
- 推流地址和播放地址的流名称不一致
- 需要等待缓冲（3-5秒）

**解决**：
1. 检查服务器终端是否显示 "[推流开始]"
2. 确认流名称一致（默认都是 "stream"）
3. 耐心等待 5 秒

### 2. FFmpeg 命令不存在？

```bash
# 安装 FFmpeg
brew install ffmpeg

# 验证
ffmpeg -version
```

### 3. 端口被占用？

修改 `server/server.js` 中的端口：
```javascript
rtmp: { port: 1936 },  // RTMP 端口
http: { port: 8081 }   // HTTP 端口
```

### 4. 如何停止推流？

在 FFmpeg 运行的终端按 `Ctrl+C`

### 5. 服务器日志太多？

这是正常的，显示推流的实时状态，可以忽略。

## 🎯 核心技术栈

- **后端**: Node.js + node-media-server + express
- **前端**: 原生 JavaScript + flv.js
- **协议**: RTMP (推流) + HTTP-FLV (拉流)
- **工具**: FFmpeg (推流测试)

## 💡 原理理解

### node-media-server 是什么？

是一个 Node.js 实现的流媒体服务器，封装了：
- RTMP 服务器（接收推流）
- HTTP-FLV 服务器（分发流）
- HLS 转码（可选）

**为什么选它**？
- 纯 JavaScript，前端开发者容易理解
- 配置简单，几行代码就能跑起来
- 可以看到每个事件（推流、拉流、断开）

### flv.js 是什么？

B站开源的 FLV 播放器，用纯 JavaScript 实现：
- 解析 FLV 格式
- 解封装音视频数据
- 喂给 `<video>` 标签播放

**为什么不用 video.src 直接播放**？
- 浏览器原生不支持 FLV 格式
- flv.js 通过 Media Source Extensions (MSE) API 实现

## 📚 学习资源

项目中包含完整的学习文档：

### 1. [FFmpeg学习指南.md](./FFmpeg学习指南.md)
- ✅ FFmpeg 工作原理和核心概念
- ✅ 常用命令速查（推流、转码、提取、截图）
- ✅ 进阶技巧（preset、CRF、GOP、硬件加速）
- ✅ 性能优化和问题诊断

### 2. [flv.js学习指南.md](./flv.js学习指南.md)
- ✅ flv.js 工作原理（MSE API）
- ✅ 完整 API 文档和配置选项
- ✅ 实战场景（直播、点播、多码率）
- ✅ 性能监控和优化

### 3. [如何掌握FFmpeg.md](./如何掌握FFmpeg.md)
- ✅ FFmpeg 掌握的三个层次
- ✅ 针对前端开发者的学习路径
- ✅ 如何判断自己"掌握了"

### 4. [publisher/README.md](./publisher/README.md)
- ✅ 实际业务中如何使用 FFmpeg
- ✅ 推流客户端技术实现

## 🎓 学习建议

运行成功后，按顺序学习：

1. **第1周**：阅读《FFmpeg学习指南.md》，掌握常用命令
2. **第2周**：阅读《如何掌握FFmpeg.md》，理解学习方法
3. **第3周**：研究 `publisher/` 代码，理解实际应用
4. **第4周**：阅读《flv.js学习指南.md》，深入播放器原理

然后可以深入：
- RTMP 协议：握手过程、消息格式
- FLV 格式：Header、Tag 结构
- HLS 对比：切片机制、m3u8 索引
- 编码原理：I帧、P帧、B帧、GOP

---

**核心思想**：推流（RTMP） → 服务器转发 → 拉流播放（HTTP-FLV）

开始你的直播学习之旅吧！🚀
