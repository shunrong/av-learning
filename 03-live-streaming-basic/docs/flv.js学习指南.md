# flv.js 深入学习指南

## 📚 flv.js 是什么？

**flv.js** 是 Bilibili（B站）开源的纯 JavaScript 实现的 FLV 播放器。

### 核心特点
- ✅ **纯 JavaScript**：无需 Flash，直接在浏览器中播放 FLV
- ✅ **低延迟**：适合直播场景（3-5秒延迟）
- ✅ **基于 MSE**：使用 HTML5 Media Source Extensions API
- ✅ **开源免费**：MIT 许可证

### 为什么需要 flv.js？

浏览器原生不支持 FLV 格式：
```javascript
// ❌ 这样不行
<video src="stream.flv"></video>

// ✅ 需要 flv.js 解析
const player = flvjs.createPlayer({ url: 'stream.flv' });
```

---

## 🏗️ 工作原理

### 完整流程

```
HTTP-FLV 流 → flv.js 解析 → MSE API → video 元素播放
    ↓            ↓            ↓           ↓
  网络请求    解封装FLV    喂数据给     浏览器渲染
             提取音视频   video元素
```

### 核心技术栈

1. **Fetch API / XHR**：获取 FLV 数据流
2. **FLV 解封装**：解析 FLV 格式，提取音视频帧
3. **Media Source Extensions (MSE)**：喂数据给 video 元素
4. **SourceBuffer**：管理音视频缓冲区

---

## 🚀 基础用法

### 1. 安装

```bash
# npm 安装
npm install flv.js

# 或直接使用 CDN
<script src="https://cdn.jsdelivr.net/npm/flv.js@latest"></script>
```

### 2. 最简单的例子

```html
<!DOCTYPE html>
<html>
<head>
  <title>flv.js Demo</title>
</head>
<body>
  <video id="videoElement" controls></video>
  
  <script src="https://cdn.jsdelivr.net/npm/flv.js@latest"></script>
  <script>
    // 检查浏览器支持
    if (flvjs.isSupported()) {
      const videoElement = document.getElementById('videoElement');
      
      // 创建播放器
      const flvPlayer = flvjs.createPlayer({
        type: 'flv',
        url: 'http://localhost:8080/live/stream.flv'
      });
      
      // 绑定到 video 元素
      flvPlayer.attachMediaElement(videoElement);
      
      // 加载并播放
      flvPlayer.load();
      flvPlayer.play();
    }
  </script>
</body>
</html>
```

### 3. 配置选项详解

```javascript
const player = flvjs.createPlayer({
  // ========== 基础配置 ==========
  type: 'flv',              // 媒体类型：'flv' 或 'mp4'
  url: 'http://...',        // 播放地址
  isLive: true,             // 是否直播流（重要！）
  
  // ========== 音视频配置 ==========
  hasAudio: true,           // 是否有音频
  hasVideo: true,           // 是否有视频
  
  // ========== 性能优化 ==========
  enableWorker: true,       // 启用 Worker（推荐）
  enableStashBuffer: false, // 禁用缓冲（减少延迟）
  stashInitialSize: 128,    // 初始缓冲大小（KB）
  
  // ========== 直播优化 ==========
  autoCleanupSourceBuffer: true,   // 自动清理缓冲区
  autoCleanupMaxBackwardDuration: 30,  // 保留30秒历史
  autoCleanupMinBackwardDuration: 10,  // 最少保留10秒
  
  // ========== CORS 配置 ==========
  cors: true,               // 允许跨域
  withCredentials: false,   // 是否携带 Cookie
  
  // ========== 其他配置 ==========
  headers: {},              // 自定义 HTTP 头
  referrerPolicy: 'no-referrer'  // Referrer 策略
});
```

---

## 🎮 完整 API

### 创建和销毁

```javascript
// 创建播放器
const player = flvjs.createPlayer(config);

// 绑定 video 元素
player.attachMediaElement(videoElement);

// 加载视频
player.load();

// 开始播放
player.play();

// 暂停
player.pause();

// 卸载（释放资源）
player.unload();

// 销毁播放器
player.destroy();

// 解绑 video 元素
player.detachMediaElement();
```

### 事件监听

```javascript
// ========== 核心事件 ==========

// 加载完成
player.on(flvjs.Events.LOADING_COMPLETE, () => {
  console.log('加载完成');
});

// 发生错误
player.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
  console.error('播放错误:', errorType, errorDetail, errorInfo);
  
  // 错误处理
  if (errorType === flvjs.ErrorTypes.NETWORK_ERROR) {
    console.log('网络错误，尝试重连...');
    player.unload();
    player.load();
  }
});

// 统计信息更新
player.on(flvjs.Events.STATISTICS_INFO, (info) => {
  console.log('统计:', info);
  // info 包含：fps, 码率, 解码速度等
});

// 元数据解析完成
player.on(flvjs.Events.MEDIA_INFO, (mediaInfo) => {
  console.log('媒体信息:', mediaInfo);
  // mediaInfo 包含：分辨率、编码格式、时长等
});

// ========== 所有事件列表 ==========
/*
- ERROR                     错误
- LOADING_COMPLETE          加载完成
- RECOVERED_EARLY_EOF       提前结束但已恢复
- MEDIA_INFO                媒体信息
- METADATA_ARRIVED          元数据到达
- SCRIPTDATA_ARRIVED        脚本数据到达
- STATISTICS_INFO           统计信息
*/
```

### 错误类型

```javascript
// 网络错误
flvjs.ErrorTypes.NETWORK_ERROR

// 媒体错误
flvjs.ErrorTypes.MEDIA_ERROR

// 其他错误
flvjs.ErrorTypes.OTHER_ERROR

// 错误详情
/*
- EXCEPTION                  异常
- HTTP_STATUS_CODE_INVALID   HTTP 状态码无效
- CONNECTING_TIMEOUT         连接超时
- EARLY_EOF                  提前结束
- UNRECOVERABLE_EARLY_EOF    不可恢复的提前结束
*/
```

---

## 🎯 实战场景

### 场景1：直播播放器（完整版）

```javascript
class LivePlayer {
  constructor(videoElement, url) {
    this.videoElement = videoElement;
    this.url = url;
    this.player = null;
    this.retryCount = 0;
    this.maxRetry = 3;
  }
  
  // 初始化播放器
  init() {
    if (!flvjs.isSupported()) {
      alert('你的浏览器不支持 flv.js');
      return;
    }
    
    this.player = flvjs.createPlayer({
      type: 'flv',
      url: this.url,
      isLive: true,
      enableWorker: true,
      enableStashBuffer: false,  // 直播不需要缓冲
      autoCleanupSourceBuffer: true,
      autoCleanupMaxBackwardDuration: 30,
      autoCleanupMinBackwardDuration: 10,
    });
    
    this.player.attachMediaElement(this.videoElement);
    this.setupEvents();
    this.player.load();
  }
  
  // 设置事件监听
  setupEvents() {
    // 错误处理
    this.player.on(flvjs.Events.ERROR, (errorType, errorDetail) => {
      console.error('错误:', errorType, errorDetail);
      
      if (errorType === flvjs.ErrorTypes.NETWORK_ERROR) {
        this.handleNetworkError();
      } else if (errorType === flvjs.ErrorTypes.MEDIA_ERROR) {
        this.handleMediaError();
      }
    });
    
    // 统计信息
    this.player.on(flvjs.Events.STATISTICS_INFO, (info) => {
      this.updateStatistics(info);
    });
    
    // 媒体信息
    this.player.on(flvjs.Events.MEDIA_INFO, (mediaInfo) => {
      console.log('分辨率:', mediaInfo.width, 'x', mediaInfo.height);
      console.log('视频编码:', mediaInfo.videoCodec);
      console.log('音频编码:', mediaInfo.audioCodec);
    });
  }
  
  // 处理网络错误
  handleNetworkError() {
    if (this.retryCount < this.maxRetry) {
      this.retryCount++;
      console.log(`重连中... (${this.retryCount}/${this.maxRetry})`);
      
      setTimeout(() => {
        this.player.unload();
        this.player.load();
      }, 2000);
    } else {
      console.error('重连失败，请刷新页面');
    }
  }
  
  // 处理媒体错误
  handleMediaError() {
    console.error('媒体解码错误');
    this.destroy();
  }
  
  // 更新统计信息
  updateStatistics(info) {
    console.log('帧率:', Math.round(info.fps));
    console.log('码率:', Math.round(info.speed / 1024), 'KB/s');
    console.log('丢帧:', info.droppedFrames);
  }
  
  // 播放
  play() {
    this.player.play();
  }
  
  // 暂停
  pause() {
    this.player.pause();
  }
  
  // 销毁
  destroy() {
    if (this.player) {
      this.player.pause();
      this.player.unload();
      this.player.detachMediaElement();
      this.player.destroy();
      this.player = null;
    }
  }
}

// 使用
const videoElement = document.getElementById('video');
const livePlayer = new LivePlayer(
  videoElement,
  'http://localhost:8080/live/stream.flv'
);
livePlayer.init();
livePlayer.play();
```

### 场景2：点播播放器

```javascript
// 点播需要缓冲，配置不同
const vodPlayer = flvjs.createPlayer({
  type: 'flv',
  url: 'http://example.com/video.flv',
  isLive: false,  // 点播
  enableWorker: true,
  enableStashBuffer: true,  // 启用缓冲
  stashInitialSize: 384,    // 更大的缓冲
});

vodPlayer.attachMediaElement(videoElement);
vodPlayer.load();
vodPlayer.play();
```

### 场景3：多码率切换

```javascript
class MultiRatePlayer {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.player = null;
    this.currentTime = 0;
    this.qualities = [
      { label: '1080p', url: 'http://server/live/1080p.flv' },
      { label: '720p',  url: 'http://server/live/720p.flv' },
      { label: '480p',  url: 'http://server/live/480p.flv' }
    ];
  }
  
  // 切换清晰度
  switchQuality(qualityIndex) {
    if (this.player) {
      // 记录当前播放位置
      this.currentTime = this.videoElement.currentTime;
      
      // 销毁旧播放器
      this.player.pause();
      this.player.unload();
      this.player.detachMediaElement();
      this.player.destroy();
    }
    
    // 创建新播放器
    const quality = this.qualities[qualityIndex];
    this.player = flvjs.createPlayer({
      type: 'flv',
      url: quality.url,
      isLive: true
    });
    
    this.player.attachMediaElement(this.videoElement);
    this.player.load();
    
    // 跳转到之前的位置
    this.videoElement.currentTime = this.currentTime;
    this.player.play();
  }
}
```

---

## 🔍 深入理解

### 1. FLV 格式简介

FLV (Flash Video) 格式结构：

```
┌─────────────┐
│ FLV Header  │ ← 9字节（文件头）
├─────────────┤
│ Tag 1       │ ← 音频/视频/脚本数据
│ Tag 2       │
│ Tag 3       │
│    ...      │
└─────────────┘
```

**每个 Tag 包含**：
- Tag Type（音频/视频/脚本）
- Data Size（数据大小）
- Timestamp（时间戳）
- StreamID
- Tag Data（实际数据）

**flv.js 的工作**：
1. 解析 FLV Header
2. 逐个解析 Tag
3. 提取音视频数据
4. 喂给 MSE API

### 2. MSE (Media Source Extensions) API

flv.js 底层使用 MSE：

```javascript
// MSE 的基本原理（简化版）
const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceopen', () => {
  const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
  
  // 不断喂数据
  sourceBuffer.appendBuffer(videoData);
});
```

**flv.js 封装了这些细节**，你只需要：
```javascript
flvPlayer.load();  // flv.js 内部处理 MSE
```

### 3. 直播延迟优化

```javascript
const player = flvjs.createPlayer({
  type: 'flv',
  url: 'http://...',
  isLive: true,
  
  // 【关键配置】减少延迟
  enableStashBuffer: false,  // 禁用缓冲
  
  // 快速清理旧数据
  autoCleanupSourceBuffer: true,
  autoCleanupMaxBackwardDuration: 10,  // 只保留10秒
  
  // 更激进的策略
  fixAudioTimestampGap: false,  // 不修复音频时间戳间隙
});

// 监控延迟
player.on(flvjs.Events.STATISTICS_INFO, (info) => {
  const delay = info.currentTime - info.serverTime;
  if (delay > 5) {
    console.warn('延迟过高:', delay, '秒');
    // 可以考虑跳到最新
    video.currentTime = video.buffered.end(0);
  }
});
```

---

## 🐛 常见问题

### 问题1：跨域 (CORS) 错误

**错误信息**：
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解决方法**：
```javascript
// 方法1：服务器添加 CORS 头（推荐）
// 在 Node.js 服务器中：
res.setHeader('Access-Control-Allow-Origin', '*');

// 方法2：flv.js 配置
const player = flvjs.createPlayer({
  type: 'flv',
  url: 'http://...',
  cors: true
});
```

### 问题2：浏览器不支持

```javascript
if (!flvjs.isSupported()) {
  alert('你的浏览器不支持 flv.js，请使用 Chrome、Firefox 或 Edge');
}

// 检查具体特性
if (!window.MediaSource) {
  console.error('浏览器不支持 MSE');
}
```

### 问题3：播放卡顿

**原因**：
1. 网络带宽不足
2. 解码性能不够
3. 缓冲区设置不当

**解决方法**：
```javascript
// 1. 启用 Worker（减轻主线程压力）
enableWorker: true

// 2. 降低清晰度

// 3. 检查统计信息
player.on(flvjs.Events.STATISTICS_INFO, (info) => {
  if (info.droppedFrames > 100) {
    console.warn('丢帧严重:', info.droppedFrames);
  }
});
```

### 问题4：内存泄漏

**原因**：未正确销毁播放器

**正确做法**：
```javascript
// 页面卸载时一定要销毁
window.addEventListener('beforeunload', () => {
  if (player) {
    player.pause();
    player.unload();
    player.detachMediaElement();
    player.destroy();
  }
});
```

---

## 📊 性能监控

### 完整的监控方案

```javascript
class PlayerMonitor {
  constructor(player, videoElement) {
    this.player = player;
    this.videoElement = videoElement;
    this.metrics = {
      fps: 0,
      bitrate: 0,
      droppedFrames: 0,
      bufferLength: 0,
      delay: 0
    };
    
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // 监听统计信息
    this.player.on(flvjs.Events.STATISTICS_INFO, (info) => {
      this.metrics.fps = Math.round(info.fps);
      this.metrics.bitrate = Math.round(info.speed / 1024); // KB/s
      this.metrics.droppedFrames = info.droppedFrames;
      
      this.updateUI();
      this.checkHealth();
    });
    
    // 定期检查缓冲区
    setInterval(() => {
      if (this.videoElement.buffered.length > 0) {
        const buffered = this.videoElement.buffered.end(0);
        const current = this.videoElement.currentTime;
        this.metrics.bufferLength = buffered - current;
      }
    }, 1000);
  }
  
  // 更新 UI
  updateUI() {
    document.getElementById('fps').textContent = this.metrics.fps;
    document.getElementById('bitrate').textContent = this.metrics.bitrate + ' KB/s';
    document.getElementById('dropped').textContent = this.metrics.droppedFrames;
    document.getElementById('buffer').textContent = this.metrics.bufferLength.toFixed(1) + 's';
  }
  
  // 健康检查
  checkHealth() {
    // 帧率过低
    if (this.metrics.fps < 20) {
      console.warn('帧率过低:', this.metrics.fps);
    }
    
    // 丢帧严重
    if (this.metrics.droppedFrames > 100) {
      console.warn('丢帧严重:', this.metrics.droppedFrames);
    }
    
    // 缓冲区过大（直播延迟高）
    if (this.metrics.bufferLength > 10) {
      console.warn('缓冲区过大，延迟:', this.metrics.bufferLength);
      // 自动跳到最新
      this.videoElement.currentTime = this.videoElement.buffered.end(0);
    }
  }
}

// 使用
const monitor = new PlayerMonitor(flvPlayer, videoElement);
```

---

## 🎓 学习资源

### 官方资源
- [flv.js GitHub](https://github.com/bilibili/flv.js)
- [API 文档](https://github.com/bilibili/flv.js/blob/master/docs/api.md)

### 相关技术
- [MSE API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API)
- [FLV 格式规范](https://rtmp.veriskope.com/pdf/video_file_format_spec_v10.pdf)

### 学习建议
1. **先用起来**：从简单例子开始
2. **看源码**：flv.js 源码很清晰，值得学习
3. **调试工具**：Chrome DevTools → Media 面板
4. **对比学习**：和 hls.js 对比理解

---

## 💡 最佳实践

### 1. 生产环境配置

```javascript
const productionConfig = {
  type: 'flv',
  url: streamUrl,
  isLive: true,
  
  // 性能优化
  enableWorker: true,
  enableStashBuffer: false,
  
  // 直播优化
  autoCleanupSourceBuffer: true,
  autoCleanupMaxBackwardDuration: 30,
  autoCleanupMinBackwardDuration: 10,
  
  // 网络配置
  cors: true,
  withCredentials: false,
  
  // 错误处理
  headers: {
    'User-Agent': 'MyPlayer/1.0'
  }
};
```

### 2. 错误重试机制

```javascript
class RobustPlayer {
  constructor(config) {
    this.config = config;
    this.retryCount = 0;
    this.maxRetry = 3;
    this.retryDelay = 2000;
  }
  
  async start() {
    try {
      await this.createPlayer();
    } catch (error) {
      this.handleError(error);
    }
  }
  
  handleError(error) {
    if (this.retryCount < this.maxRetry) {
      this.retryCount++;
      console.log(`重试 ${this.retryCount}/${this.maxRetry}...`);
      
      setTimeout(() => {
        this.start();
      }, this.retryDelay);
    } else {
      this.onFatalError(error);
    }
  }
  
  onFatalError(error) {
    console.error('播放失败:', error);
    // 通知用户
  }
}
```

---

**记住**：flv.js 是一个成熟的库，掌握基础 API 就能应对大部分场景。深入学习可以看源码和 MSE 规范。🚀
