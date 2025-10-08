# 04-hls-live-streaming - HLS 直播系统

> 实现 HLS 协议的完整直播方案，对比 HTTP-FLV，理解切片机制

## 📚 项目目标

在 03 项目的基础上，实现 HLS 直播系统，完整理解：
- HLS 协议的工作原理
- TS 切片的生成过程
- m3u8 索引文件的动态更新
- 多码率自适应播放
- HLS vs HTTP-FLV 的优劣对比

## 🎯 技术栈

- **推流**: RTMP (复用 03 项目)
- **服务器**: Node.js + node-media-server (增强版)
- **切片**: FFmpeg (实时切片)
- **播放器**: hls.js (浏览器) / 原生 video (Safari)
- **进阶**: LL-HLS (Low Latency HLS)

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    04 HLS 直播系统架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  主播端 (复用 03 项目)                                            │
│    └── FFmpeg 推流 → RTMP                                       │
│                                                                 │
│  服务器端 (Node.js)                                              │
│    ├── 接收 RTMP 流                                             │
│    ├── 实时切片（FFmpeg）                                        │
│    │   ├── 生成 TS 切片 (segment_0.ts, segment_1.ts...)        │
│    │   └── 生成 m3u8 索引                                       │
│    ├── HTTP 服务器                                              │
│    │   ├── 提供 m3u8 文件                                       │
│    │   └── 提供 TS 切片文件                                     │
│    └── 多码率转码（可选）                                        │
│        ├── 1080p.m3u8                                          │
│        ├── 720p.m3u8                                           │
│        └── 480p.m3u8                                           │
│                                                                 │
│  播放器端                                                        │
│    ├── hls.js (Chrome/Firefox/Edge)                           │
│    ├── 原生播放 (Safari/iOS)                                   │
│    └── 自适应码率切换                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📂 项目结构

```
04-hls-live-streaming/
├── package.json
├── README.md
├── server/
│   ├── server.js              # 主服务器（RTMP + HLS）
│   ├── HLSSegmenter.js        # HLS 切片器
│   └── TranscodeManager.js    # 多码率转码管理器
├── client/
│   ├── index.html             # 首页
│   ├── player.html            # HLS 播放器
│   ├── compare.html           # HTTP-FLV vs HLS 对比页面
│   └── multi-bitrate.html     # 多码率演示
├── hls/                       # HLS 输出目录（动态生成）
│   ├── stream/
│   │   ├── index.m3u8         # 主播放列表
│   │   ├── 1080p.m3u8         # 1080p 播放列表
│   │   ├── 720p.m3u8          # 720p 播放列表
│   │   ├── 480p.m3u8          # 480p 播放列表
│   │   ├── segment_0.ts       # TS 切片
│   │   ├── segment_1.ts
│   │   └── ...
│   └── [其他流]
└── docs/
    ├── HLS协议详解.md
    ├── TS格式解析.md
    └── 性能对比报告.md
```

## 🚀 实现步骤

### 第一阶段：基础 HLS 实现

**目标**: 实现单码率 HLS 直播

**核心功能**:
1. RTMP 接收（复用 03）
2. 实时切片（FFmpeg）
3. m3u8 动态更新
4. HLS 播放器

**技术要点**:
```javascript
// HLS 切片器核心逻辑
class HLSSegmenter {
  startSegment(rtmpStream) {
    // 使用 FFmpeg 实时切片
    const ffmpeg = spawn('ffmpeg', [
      '-i', `rtmp://localhost/live/${streamName}`,
      '-c', 'copy',                    // 不重新编码
      '-f', 'hls',                     // HLS 格式
      '-hls_time', '6',                // 6秒一个切片
      '-hls_list_size', '10',          // 保留10个切片
      '-hls_flags', 'delete_segments', // 删除旧切片
      `./hls/${streamName}/index.m3u8`
    ]);
  }
}
```

**学习要点**:
- HLS 基本概念
- m3u8 文件格式
- TS 封装格式
- 延迟产生原因

---

### 第二阶段：多码率转码

**目标**: 实现自适应码率播放（ABR）

**核心功能**:
1. 同时生成多个码率
2. Master Playlist
3. 播放器自动切换

**技术要点**:
```javascript
// 多码率转码
class TranscodeManager {
  async transcode(inputStream) {
    // 1080p
    this.spawn1080p(inputStream);
    
    // 720p
    this.spawn720p(inputStream);
    
    // 480p
    this.spawn480p(inputStream);
    
    // 生成 Master Playlist
    this.generateMasterPlaylist();
  }
  
  generateMasterPlaylist() {
    const m3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480
480p.m3u8
`;
    fs.writeFileSync('./hls/stream/index.m3u8', m3u8);
  }
}
```

**学习要点**:
- Master Playlist vs Media Playlist
- 自适应码率算法
- 带宽估算
- 无缝切换

---

### 第三阶段：性能优化

**目标**: 降低延迟，优化体验

**优化方向**:
1. **减小切片时长**: 6秒 → 2秒
2. **减少缓冲**: 默认3个切片 → 1个切片
3. **预加载**: 提前加载下一个切片
4. **GOP对齐**: 确保切片从关键帧开始

**技术要点**:
```javascript
// hls.js 低延迟配置
const hlsConfig = {
  maxBufferLength: 10,           // 最大缓冲10秒
  maxMaxBufferLength: 30,        // 极限缓冲30秒
  liveSyncDurationCount: 1,      // 只缓冲1个切片（低延迟）
  liveMaxLatencyDurationCount: 3,// 最大3个切片
  enableWorker: true,            // 启用 Worker（性能）
  lowLatencyMode: true           // 低延迟模式
};

const hls = new Hls(hlsConfig);
```

**学习要点**:
- HLS 延迟来源分析
- 切片时长权衡
- 缓冲策略
- GOP 概念

---

### 第四阶段：LL-HLS 实现

**目标**: 实现低延迟 HLS（< 3秒）

**核心技术**:
1. Partial Segments（部分切片）
2. Preload Hints（预加载提示）
3. Blocking Playlist Reload（阻塞式刷新）

**技术要点**:
```bash
# FFmpeg LL-HLS 切片
ffmpeg -i rtmp://localhost/live/stream \
  -c copy \
  -f hls \
  -hls_time 2 \                        # 2秒切片
  -hls_list_size 10 \
  -hls_flags independent_segments \    # 独立切片
  -var_stream_map "v:0,a:0" \
  -master_pl_name master.m3u8 \
  -hls_segment_type fmp4 \             # fMP4（支持部分切片）
  -hls_fmp4_init_filename init.mp4 \
  ./hls/stream/index.m3u8
```

```m3u8
# LL-HLS m3u8 示例
#EXTM3U
#EXT-X-VERSION:9
#EXT-X-TARGETDURATION:2
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=0.5
#EXT-X-PART-INF:PART-TARGET=0.5

#EXT-X-PART:DURATION=0.5,URI="seg1_part0.m4s"
#EXT-X-PART:DURATION=0.5,URI="seg1_part1.m4s"
#EXT-X-PART:DURATION=0.5,URI="seg1_part2.m4s"
#EXT-X-PART:DURATION=0.5,URI="seg1_part3.m4s"
#EXTINF:2.0,
segment_1.m4s

#EXT-X-PRELOAD-HINT:TYPE=PART,URI="seg2_part0.m4s"
```

**学习要点**:
- LL-HLS 规范（RFC 8216）
- fMP4 vs TS
- 部分切片机制
- Apple 最新实践

---

## 📊 对比实验

### HTTP-FLV vs HLS

创建对比页面，同时播放两种协议，实时对比：

```html
<!-- compare.html -->
<div class="comparison">
  <div class="player-container">
    <h3>HTTP-FLV (03项目)</h3>
    <video id="flv-player"></video>
    <div class="metrics">
      <p>延迟: <span id="flv-latency">-</span>ms</p>
      <p>缓冲: <span id="flv-buffer">-</span>s</p>
      <p>卡顿: <span id="flv-stalls">-</span>次</p>
    </div>
  </div>
  
  <div class="player-container">
    <h3>HLS (04项目)</h3>
    <video id="hls-player"></video>
    <div class="metrics">
      <p>延迟: <span id="hls-latency">-</span>ms</p>
      <p>缓冲: <span id="hls-buffer">-</span>s</p>
      <p>卡顿: <span id="hls-stalls">-</span>次</p>
    </div>
  </div>
</div>
```

**实测数据记录**:
```javascript
// 自动化测试脚本
class ProtocolComparison {
  async runTest(duration = 300) { // 5分钟测试
    const results = {
      flv: { latency: [], buffer: [], stalls: 0 },
      hls: { latency: [], buffer: [], stalls: 0 }
    };
    
    // 每秒采集数据
    setInterval(() => {
      results.flv.latency.push(this.measureLatency('flv'));
      results.hls.latency.push(this.measureLatency('hls'));
      // ... 其他指标
    }, 1000);
    
    // 生成报告
    setTimeout(() => {
      this.generateReport(results);
    }, duration * 1000);
  }
  
  generateReport(results) {
    console.log(`
性能对比报告
=============

延迟:
  HTTP-FLV: ${avg(results.flv.latency)}ms (±${std(results.flv.latency)}ms)
  HLS:      ${avg(results.hls.latency)}ms (±${std(results.hls.latency)}ms)

缓冲:
  HTTP-FLV: ${avg(results.flv.buffer)}s
  HLS:      ${avg(results.hls.buffer)}s

卡顿:
  HTTP-FLV: ${results.flv.stalls}次
  HLS:      ${results.hls.stalls}次

结论:
  ${this.conclusion(results)}
    `);
  }
}
```

---

## 🎓 学习路径

### Week 1-2: 基础实现
- [ ] 搭建 HLS 服务器（RTMP → HLS 切片）
- [ ] 实现基础播放器（hls.js）
- [ ] 理解 m3u8 格式
- [ ] 理解 TS 封装

**产出**: 能跑通的单码率 HLS 直播

### Week 3-4: 多码率转码
- [ ] 实现多码率转码
- [ ] 生成 Master Playlist
- [ ] 实现自适应播放
- [ ] 带宽估算算法

**产出**: 支持 ABR 的 HLS 直播

### Week 5-6: 性能优化
- [ ] 延迟分析与优化
- [ ] 对比 HTTP-FLV 性能
- [ ] 编写性能测试工具
- [ ] 撰写对比报告

**产出**: 性能对比报告 + 优化方案

### Week 7-8: LL-HLS（可选）
- [ ] 研究 LL-HLS 规范
- [ ] 实现部分切片
- [ ] 实现预加载提示
- [ ] 测试延迟改善

**产出**: 低延迟 HLS 实现（<3秒）

---

## 🔧 技术难点

### 1. 实时切片的挑战

**问题**: 如何确保切片从关键帧开始？

```javascript
// 解决方案：GOP 对齐
const ffmpegArgs = [
  '-force_key_frames', 'expr:gte(t,n_forced*6)', // 强制每6秒一个关键帧
  '-g', '180',                                    // GOP 180帧（6秒×30fps）
  '-keyint_min', '180',                           // 最小GOP
  '-sc_threshold', '0'                            // 禁用场景切换检测
];

// 确保切片边界对齐关键帧
```

### 2. m3u8 的动态更新

**问题**: 如何实时更新 m3u8 而不影响正在播放的客户端？

```javascript
// 解决方案：滑动窗口 + 原子写入
class PlaylistManager {
  updatePlaylist(newSegment) {
    // 1. 更新内存中的播放列表
    this.segments.push(newSegment);
    
    // 2. 保持滑动窗口（最多10个切片）
    if (this.segments.length > 10) {
      const removed = this.segments.shift();
      // 删除旧切片文件
      fs.unlinkSync(removed.path);
    }
    
    // 3. 生成新的 m3u8 内容
    const content = this.generateM3U8();
    
    // 4. 原子写入（先写临时文件，再重命名）
    const tmpFile = `${this.m3u8Path}.tmp`;
    fs.writeFileSync(tmpFile, content);
    fs.renameSync(tmpFile, this.m3u8Path);  // 原子操作
  }
}
```

### 3. 多码率的同步问题

**问题**: 不同码率的切片如何保持同步？

```javascript
// 解决方案：使用相同的时间戳和切片边界
const transcodeConfigs = [
  {
    name: '1080p',
    resolution: '1920x1080',
    bitrate: '4000k',
    outputPath: './hls/stream/1080p.m3u8'
  },
  {
    name: '720p',
    resolution: '1280x720',
    bitrate: '2000k',
    outputPath: './hls/stream/720p.m3u8'
  }
];

// 关键：使用相同的 -force_key_frames 参数
// 确保所有码率的切片边界对齐
transcodeConfigs.forEach(config => {
  spawn('ffmpeg', [
    '-i', inputStream,
    '-force_key_frames', 'expr:gte(t,n_forced*6)', // 相同的关键帧位置
    '-s', config.resolution,
    '-b:v', config.bitrate,
    '-f', 'hls',
    config.outputPath
  ]);
});
```

---

## 📖 核心概念学习

### HLS 关键概念

```
1. Master Playlist (主播放列表)
   └── 列出所有可用的码率

2. Media Playlist (媒体播放列表)
   └── 列出具体的 TS 切片

3. TS Segment (传输流切片)
   └── 实际的视频数据（2-10秒）

4. ABR (Adaptive Bitrate)
   └── 根据带宽自动切换码率

5. Live vs VOD
   ├── Live: 不断更新的播放列表
   └── VOD: 固定的播放列表（#EXT-X-ENDLIST）
```

### TS 格式深入

```
TS (MPEG-TS) 结构：

┌─────────────────────────────┐
│  TS Packet (188 bytes)      │
├─────────────────────────────┤
│  Header (4 bytes)           │
│  ├── Sync Byte (0x47)       │
│  ├── PID (13 bits)          │
│  └── ...                    │
├─────────────────────────────┤
│  Payload (184 bytes)        │
│  ├── PAT (PID=0)            │
│  ├── PMT                    │
│  └── PES (音视频数据)        │
└─────────────────────────────┘

多个 TS Packet 组成一个 TS 文件
```

---

## 🎯 项目亮点

完成后你将掌握：

1. **HLS 完整实现**: 从推流到播放的全链路
2. **多码率转码**: 理解自适应码率原理
3. **性能对比**: HTTP-FLV vs HLS 的实测数据
4. **优化经验**: 延迟、卡顿、带宽的权衡
5. **TS 格式**: 深入理解 MPEG-TS 封装

**对比 03 项目的进步**:
- ✅ 03: RTMP + HTTP-FLV（低延迟，实时性强）
- ✅ 04: RTMP + HLS（兼容性好，CDN友好）
- ✅ 理解两种方案的适用场景和权衡

---

## 🚀 下一步：05 项目展望

完成 03 和 04 后，可以考虑：

**05-webrtc-live**: WebRTC 超低延迟直播
- 推流: WebRTC（<500ms）
- 拉流: WebRTC（SFU架构）
- 连麦: P2P / SFU
- 适用: 实时互动直播

**06-live-platform**: 综合直播平台
- 多协议支持（RTMP/WebRTC/SRT）
- 多格式输出（FLV/HLS/WebRTC）
- 完整后台管理
- 数据监控和分析

循序渐进，掌握完整的直播技术栈！🎉

