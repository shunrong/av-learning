# HLS 技术要点深度解析

## 📚 什么是 HLS？

**HLS (HTTP Live Streaming)** 是 Apple 公司在 2009 年推出的流媒体传输协议。

### 核心概念

```
HLS = HTTP + 切片 + 索引

┌─────────────────────────────────────┐
│          完整的 HLS 链路             │
├─────────────────────────────────────┤
│                                     │
│  RTMP 推流                          │
│    ↓                                │
│  FFmpeg 接收                        │
│    ↓                                │
│  实时切片（每 6 秒一个 TS 文件）      │
│    ↓                                │
│  生成 m3u8 索引（列出最新切片）       │
│    ↓                                │
│  HTTP 服务器（提供 m3u8 和 TS）      │
│    ↓                                │
│  播放器定期下载 m3u8                 │
│    ↓                                │
│  根据 m3u8 下载 TS 切片              │
│    ↓                                │
│  解码播放                            │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 核心组件

### 1. m3u8 播放列表

**m3u8 = m3u (播放列表) + UTF-8**

```m3u8
#EXTM3U                              ← 魔数（必须是第一行）
#EXT-X-VERSION:3                     ← HLS 版本
#EXT-X-TARGETDURATION:6              ← 最大切片时长（秒）
#EXT-X-MEDIA-SEQUENCE:10             ← 第一个切片的序号

#EXTINF:6.000000,                    ← 切片时长
segment_10.ts                        ← 切片文件名
#EXTINF:6.000000,
segment_11.ts
#EXTINF:6.000000,
segment_12.ts
```

**关键字段解析**：

```
#EXT-X-VERSION:
├── 3: 标准 HLS
├── 4: 支持 I-Frame 播放列表
├── 6: 支持加密
└── 9: LL-HLS（低延迟）

#EXT-X-TARGETDURATION:
目的：告诉播放器每个切片的最大时长
用途：播放器知道何时刷新 m3u8

#EXT-X-MEDIA-SEQUENCE:
目的：标识切片序号（滑动窗口）
示例：序号 10 表示之前的 0-9 已被删除

#EXTINF:
格式：#EXTINF:<duration>,<title>
duration: 切片实际时长（秒）
title: 可选的标题
```

**直播 vs 点播**：

```m3u8
# 直播（Live）- 不断更新
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100     ← 序号不断增加
segment_100.ts               ← 滑动窗口
segment_101.ts
segment_102.ts

# 点播（VOD）- 固定内容
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
segment_0.ts
segment_1.ts
...
segment_100.ts
#EXT-X-ENDLIST               ← 标记：这是最后一个切片
```

---

### 2. TS 切片文件

**TS (MPEG Transport Stream)** 是一种容器格式，专为流媒体传输设计。

#### TS 包结构

```
一个 TS 文件 = 多个 TS Packet

TS Packet (188 bytes)：
┌─────────────────────────────────┐
│  Header (4 bytes)               │
│  ├── Sync Byte: 0x47 (固定)     │
│  ├── PID: 13 bits               │
│  ├── Flags: ...                 │
│  └── Continuity Counter         │
├─────────────────────────────────┤
│  Payload (184 bytes)            │
│  ├── PAT (PID=0)                │
│  ├── PMT                        │
│  ├── PES (音视频数据)            │
│  └── ...                        │
└─────────────────────────────────┘
```

#### 关键概念

**PID (Packet Identifier)**：
```
PID = 0:  PAT (Program Association Table)
          └── 告诉解码器 PMT 在哪里

PID = PMT: PMT (Program Map Table)
          └── 告诉解码器音视频流的 PID

PID = 256: 视频流（示例）
PID = 257: 音频流（示例）
```

**PAT (Program Association Table)**：
```
作用：节目关联表
内容：列出所有节目的 PMT PID
例如：节目1 的 PMT 在 PID=4096
```

**PMT (Program Map Table)**：
```
作用：节目映射表
内容：列出当前节目的音视频流 PID
例如：
├── 视频流: PID=256, Codec=H.264
└── 音频流: PID=257, Codec=AAC
```

**PES (Packetized Elementary Stream)**：
```
作用：封装实际的音视频数据
结构：
PES Header (可变长度)
├── Start Code: 0x000001
├── Stream ID: 音频/视频标识
├── PTS: 显示时间戳
├── DTS: 解码时间戳
└── ...

PES Data (实际的 H.264/AAC 数据)
```

#### 为什么用 TS 而不是 MP4？

```
TS 的优势：
✅ 容错性好：每个 Packet 独立，丢失一个不影响其他
✅ 起始码：每个 Packet 以 0x47 开始，容易同步
✅ 固定长度：188 字节，便于硬件处理
✅ 流式传输：不需要完整文件头，可以边下边播

MP4 的劣势：
❌ 需要完整文件头（moov box）
❌ 不适合流式传输
❌ 丢包后难以恢复

新趋势：fMP4 (Fragmented MP4)
├── LL-HLS 使用 fMP4
├── 结合了 MP4 的压缩率和 TS 的流式特性
└── Apple 推荐的新格式
```

---

## ⚙️ HLS 切片过程

### FFmpeg 切片命令解析

```bash
ffmpeg -i rtmp://localhost/live/stream \
  -c copy \                            # 不重新编码（直接复制）
  -f hls \                             # HLS 格式
  -hls_time 6 \                        # 每个切片 6 秒
  -hls_list_size 10 \                  # m3u8 中保留 10 个切片
  -hls_flags delete_segments \         # 删除旧切片
  -hls_segment_filename 'segment_%d.ts' \  # 切片命名格式
  index.m3u8                           # 输出 m3u8
```

### 参数详解

**hls_time（切片时长）**：
```
影响：
├── 时长越长 → 延迟越高，但效率越高
└── 时长越短 → 延迟越低，但效率越低

推荐值：
├── 标准直播：6-10 秒
├── 低延迟：2-4 秒
└── LL-HLS：0.5-1 秒（部分切片）

注意：
实际切片时长取决于 GOP（关键帧间隔）
```

**hls_list_size（m3u8 切片数量）**：
```
作用：m3u8 中保留最近 N 个切片

例如：hls_list_size=10，hls_time=6
├── m3u8 覆盖时长：10 × 6 = 60 秒
├── 新观众最多回看 60 秒前的内容
└── 60 秒前的切片被删除

推荐值：
├── 标准直播：5-10 个
├── 低延迟：3-5 个
└── 点播：全部保留（不设置）
```

**hls_flags（切片行为）**：
```
delete_segments:
└── 自动删除旧切片（节省磁盘空间）

split_by_time:
└── 严格按时间切片（不等关键帧）
    警告：可能导致播放问题

independent_segments:
└── 每个切片独立（LL-HLS 需要）

append_list:
└── 追加模式（点播）
```

---

## 🎯 GOP 对齐问题

### 什么是 GOP？

**GOP (Group of Pictures)** = 一组视频帧

```
GOP 结构：
I P P P P P I P P P P P I ...
│←─ GOP 1 ─→│←─ GOP 2 ─→│

I 帧（关键帧）：完整画面，可独立解码
P 帧（预测帧）：参考前一帧的差异
B 帧（双向帧）：参考前后帧（直播少用）
```

### 为什么 GOP 很重要？

**问题：切片必须从 I 帧开始**

```
错误的切片：
GOP: I P P P P P I P P P P P I
切片：     │←切片1→│←切片2→│
           ↑ 从 P 帧开始
结果：播放器无法解码（缺少 I 帧）

正确的切片：
GOP: I P P P P P I P P P P P I
切片： │←切片1→│←切片2→│
       ↑ 从 I 帧开始
结果：正常播放 ✅
```

### 如何保证 GOP 对齐？

**方法1：强制关键帧**

```bash
ffmpeg -i input \
  -force_key_frames "expr:gte(t,n_forced*6)" \  # 每 6 秒强制 I 帧
  -g 180 \                                      # GOP 大小（6秒×30fps）
  -keyint_min 180 \                             # 最小 GOP
  -sc_threshold 0 \                             # 禁用场景切换
  -f hls output.m3u8
```

**方法2：使用 hls_time = GOP 时长**

```bash
# 如果 GOP = 2 秒（60 帧 @ 30fps）
ffmpeg -i input \
  -g 60 \        # GOP = 60 帧
  -hls_time 2 \  # 切片 = 2 秒
  -f hls output.m3u8

# GOP 和切片时长一致，自然对齐
```

---

## 📊 延迟分析

### HLS 延迟来源

```
┌──────────────────────┬────────┬───────────┐
│        环节          │  时长  │   占比    │
├──────────────────────┼────────┼───────────┤
│ 1. 采集编码          │  50ms  │   小      │
│ 2. RTMP 推流         │ 100ms  │   小      │
│ 3. 服务器接收        │  50ms  │   小      │
│ 4. 等待切片完成      │  6s    │ ★★★ 大  │
│ 5. 写入磁盘          │ 100ms  │   小      │
│ 6. 播放器刷新 m3u8   │  1s    │   中      │
│ 7. 下载 TS 切片      │  2s    │ ★★ 中   │
│ 8. 播放器缓冲        │  6s    │ ★★★ 大  │
│ 9. 解码渲染          │ 100ms  │   小      │
├──────────────────────┼────────┼───────────┤
│        总延迟        │ ~15s   │           │
└──────────────────────┴────────┴───────────┘
```

### 优化策略

**1. 减小切片时长**
```
hls_time=6 → hls_time=2

效果：
├── 切片等待：6s → 2s（减少 4s）
├── 播放器缓冲：6s → 2s（减少 4s）
└── 总延迟：15s → 7s（减少 8s）

代价：
├── 切片数量增加 3 倍
├── HTTP 请求数增加 3 倍
└── 服务器压力增加
```

**2. 减少播放器缓冲**
```javascript
// hls.js 配置
{
  maxBufferLength: 10,        // 默认 30s → 10s
  liveSyncDurationCount: 1,   // 默认 3 → 1（只缓冲 1 个切片）
}

效果：
└── 播放器缓冲：3个切片 → 1个切片（减少 12s）

代价：
└── 网络波动时容易卡顿
```

**3. LL-HLS（终极方案）**
```
使用部分切片（Partial Segment）：
├── 完整切片：6 秒
├── 部分切片：0.5 秒（12 个部分 = 1 个完整）
└── 播放器实时下载部分切片

效果：
└── 总延迟：15s → 3s

复杂度：
└── 需要 fMP4、Server Push、新版 hls.js
```

---

## 🔍 多码率实现（ABR）

### Master Playlist

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.64001f,mp4a.40.2"
1080p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720p/index.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480,CODECS="avc1.64001f,mp4a.40.2"
480p/index.m3u8
```

### 播放器选择逻辑

```javascript
class BitrateSelector {
  selectInitialBitrate(bandwidth) {
    // 保守策略：选择 70% 带宽对应的码率
    const targetBitrate = bandwidth * 0.7;
    
    const levels = [
      { bitrate: 4000000, label: '1080p' },
      { bitrate: 2000000, label: '720p' },
      { bitrate: 800000, label: '480p' }
    ];
    
    // 选择不超过目标码率的最高质量
    for (let i = levels.length - 1; i >= 0; i--) {
      if (levels[i].bitrate <= targetBitrate) {
        return levels[i];
      }
    }
    
    // 兜底：最低码率
    return levels[levels.length - 1];
  }
  
  shouldSwitchBitrate(currentLevel, bandwidth, bufferLength) {
    // 升级条件
    if (bandwidth > currentLevel.bitrate * 1.5 && bufferLength > 10) {
      return 'up';
    }
    
    // 降级条件
    if (bandwidth < currentLevel.bitrate * 0.8 || bufferLength < 2) {
      return 'down';
    }
    
    return 'keep';
  }
}
```

---

## 💡 实战技巧

### 1. 查看实时 m3u8 更新

```bash
# Mac/Linux
watch -n 1 cat media/live/stream/index.m3u8

# 输出会每秒刷新，观察 MEDIA-SEQUENCE 变化
```

### 2. 分析 TS 文件

```bash
# 查看 TS 文件信息
ffprobe -v error -show_format -show_streams segment_0.ts

# 查看 TS 包结构
ffmpeg -i segment_0.ts -c copy -bsf:v trace_headers -f null -

# 提取 H.264 流
ffmpeg -i segment_0.ts -c copy -bsf:v h264_mp4toannexb output.h264
```

### 3. 手动测试 HLS

```bash
# 下载 m3u8
curl -o index.m3u8 http://localhost:8080/live/stream/index.m3u8

# 播放 HLS（使用 FFplay）
ffplay http://localhost:8080/live/stream/index.m3u8

# 录制 HLS 直播
ffmpeg -i http://localhost:8080/live/stream/index.m3u8 -c copy output.mp4
```

---

## 📚 延伸阅读

- [HLS RFC 8216](https://tools.ietf.org/html/rfc8216) - 官方规范
- [Apple HLS Authoring Specification](https://developer.apple.com/documentation/http_live_streaming) - Apple 官方指南
- [LL-HLS Preliminary Specification](https://github.com/video-dev/hls.js/blob/master/docs/design.md) - 低延迟 HLS

---

**掌握这些概念，你就理解了 HLS 的精髓！** 🎉

