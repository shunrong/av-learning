# 推流客户端

模拟真实直播业务场景的推流客户端，展示实际应用中如何使用 FFmpeg。

## 📚 这个项目展示了什么？

这就是实际直播平台（抖音、斗鱼、B站）的主播端软件的工作方式：

```
主播操作                         后台处理
   ↓                               ↓
点击"开始直播"  →  Node.js 调用 FFmpeg  →  推流到服务器
选择画质        →  构建 FFmpeg 参数      →  实时统计
查看状态        →  解析 FFmpeg 输出      →  显示给主播
```

**关键点**：
- ✅ 主播**不需要**敲命令行
- ✅ 主播**不需要**了解 FFmpeg
- ✅ 主播只需要点击按钮，软件后台自动调用 FFmpeg

## 🏗️ 项目结构

```
publisher/
├── package.json              # 项目配置
├── README.md                # 本文件
├── src/
│   ├── LivePublisher.js     # 推流核心类（封装 FFmpeg）
│   └── server.js            # Web 服务器 + WebSocket
├── public/
│   └── index.html           # 推流控制面板
└── scripts/
    └── test-push.sh         # 快速测试脚本
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd publisher
npm install
```

### 2. 启动推流客户端

```bash
npm start
```

### 3. 打开控制面板

浏览器访问：`http://localhost:3002`

### 4. 配置推流

1. **推流地址**：`rtmp://localhost:1935/live/stream`
2. **输入源**：选择"摄像头"或"视频文件"
3. **画质**：选择合适的画质
4. **点击"开始推流"**

### 5. 观看直播

打开播放器：`http://localhost:3001/player.html`

## 📖 使用场景

### 场景1：摄像头直播

```
1. 选择"摄像头"
2. 设备索引：0:0（默认摄像头+麦克风）
3. 画质：高清 720p
4. 点击"开始推流"
```

### 场景2：视频文件测试

```
1. 选择"视频文件"
2. 文件路径：/path/to/test.mp4
3. 画质：高清 720p
4. 点击"开始推流"
```

### 场景3：快速测试（命令行）

```bash
npm run test:push
```

## 🎯 核心代码解析

### LivePublisher 类

封装了 FFmpeg 的调用逻辑：

```javascript
const publisher = new LivePublisher();

// 开始推流
publisher.startLive({
  rtmpUrl: 'rtmp://localhost:1935/live/stream',
  inputType: 'device',  // 'device' 或 'file'
  inputSource: '0:0',   // 设备索引或文件路径
  quality: 'medium'     // 'low'、'medium'、'high'、'ultra'
});

// 监听事件
publisher.on('started', () => console.log('推流开始'));
publisher.on('stats', (stats) => console.log('统计:', stats));
publisher.on('error', (error) => console.log('错误:', error));
publisher.on('stopped', () => console.log('推流停止'));

// 停止推流
publisher.stopLive();
```

### 实际执行的 FFmpeg 命令

当你点击"开始推流"时，后台会执行类似这样的命令：

```bash
# 摄像头模式
ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 -i "0:0" \
  -c:v libx264 -preset fast -b:v 2000k -maxrate 2000k -bufsize 4000k \
  -g 60 -c:a aac -b:a 128k -ar 44100 \
  -f flv rtmp://localhost:1935/live/stream

# 文件模式
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -c:v libx264 -preset fast -b:v 2000k \
  -c:a aac -b:a 128k \
  -f flv rtmp://localhost:1935/live/stream
```

**但主播看不到这个命令**，他们只看到友好的 UI 界面。

## 🔍 技术细节

### 1. 如何调用 FFmpeg

使用 Node.js 的 `child_process.spawn`：

```javascript
const { spawn } = require('child_process');

const ffmpegProcess = spawn('ffmpeg', [
  '-f', 'avfoundation',
  '-i', '0:0',
  '-c:v', 'libx264',
  '-f', 'flv',
  'rtmp://localhost:1935/live/stream'
]);

// 监听输出
ffmpegProcess.stderr.on('data', (data) => {
  // 解析 FFmpeg 输出的统计信息
  console.log(data.toString());
});
```

### 2. 如何解析统计信息

FFmpeg 输出格式：
```
frame= 1234 fps= 30 q=28.0 size= 12345kB time=00:01:23.45 bitrate=1234.5kbits/s
```

解析代码：
```javascript
const fpsMatch = output.match(/fps=\s*([\d.]+)/);
const bitrateMatch = output.match(/bitrate=\s*([\d.]+)kbits\/s/);
```

### 3. 如何停止推流

发送 SIGINT 信号（相当于 Ctrl+C）：
```javascript
ffmpegProcess.kill('SIGINT');
```

### 4. 如何实时通信

使用 WebSocket：
```javascript
// 服务端
publisher.on('stats', (stats) => {
  ws.send(JSON.stringify({ type: 'stats', data: stats }));
});

// 客户端
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'stats') {
    updateUI(message.data);
  }
};
```

## 🎓 对比其他方案

### 方案1：命令行 FFmpeg（我们之前的做法）

```bash
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://server/live/stream
```

**缺点**：
- ❌ 需要手动敲命令
- ❌ 没有友好的 UI
- ❌ 无法实时看到统计信息
- ❌ 不适合普通用户

### 方案2：推流客户端（当前项目）

- ✅ 友好的 Web UI
- ✅ 实时统计信息
- ✅ 支持摄像头和文件
- ✅ 错误提示和日志
- ✅ 适合普通用户

### 方案3：OBS（专业直播软件）

- ✅ 功能最全（场景切换、滤镜、多路输入）
- ✅ 专业级别
- ❌ 体积大、复杂
- ❌ 不适合嵌入到自己的应用

## 💡 扩展建议

### 1. 多路推流

同时推到多个平台：
```javascript
const publishers = [
  new LivePublisher(),  // 推到抖音
  new LivePublisher(),  // 推到 B 站
  new LivePublisher()   // 推到斗鱼
];

publishers.forEach((pub, index) => {
  pub.startLive({
    rtmpUrl: rtmpUrls[index],
    // ...
  });
});
```

### 2. 断线重连

```javascript
publisher.on('error', (error) => {
  if (error.code === 'NETWORK_ERROR') {
    setTimeout(() => {
      publisher.startLive(config);  // 重连
    }, 3000);
  }
});
```

### 3. 录制本地文件

同时推流和录制：
```javascript
ffmpeg -i input \
  -c copy -f flv rtmp://server/live/stream \  # 推流
  -c copy output.mp4                          # 录制
```

### 4. 添加水印

```javascript
ffmpeg -i input \
  -i watermark.png \
  -filter_complex "overlay=10:10" \
  -f flv rtmp://server/live/stream
```

## 🐛 常见问题

### Q: 推流后黑屏？

A: 检查：
1. RTMP 服务器是否启动
2. 推流地址是否正确
3. 查看日志中的错误信息

### Q: 延迟很高？

A: 优化参数：
- 使用 `preset: ultrafast`
- 减小 GOP (`-g 30`)
- 降低码率

### Q: 无法使用摄像头？

A: 
1. 检查设备索引（运行 `ffmpeg -f avfoundation -list_devices true -i ""`）
2. 授予浏览器摄像头权限
3. 确认没有其他应用占用摄像头

## 📚 学习资源

- [FFmpeg 学习指南](../FFmpeg学习指南.md)
- [如何掌握 FFmpeg](../如何掌握FFmpeg.md)
- [flv.js 学习指南](../flv.js学习指南.md)

## 🎯 总结

这个项目展示了：

1. **实际应用中如何使用 FFmpeg**
   - 不是命令行，而是代码调用
   - 封装成类，提供友好的 API
   
2. **前端开发者如何做直播**
   - 用 Node.js 调用 FFmpeg
   - 用 WebSocket 实时通信
   - 用 Web UI 提供友好界面

3. **FFmpeg 只是工具**
   - 重要的是业务逻辑和用户体验
   - 掌握常用命令即可
   - 不需要成为 FFmpeg 专家

---

现在你理解了实际业务中如何使用 FFmpeg 了吗？🚀
