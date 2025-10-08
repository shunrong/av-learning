# FFmpeg 深入学习指南

## 📚 FFmpeg 是什么？

FFmpeg 是一个**开源的音视频处理工具集**，包含：
- **ffmpeg**: 音视频转换、编码、推流等
- **ffprobe**: 查看媒体文件信息
- **ffplay**: 简单的播放器

几乎所有视频网站、直播平台底层都在用它。

---

## 🎯 核心概念

### 1. FFmpeg 的工作流程

```
输入 → 解码 → 处理 → 编码 → 输出
  ↓      ↓      ↓      ↓      ↓
文件   解封装  滤镜   重新编码  文件/流
```

**示例**：
```bash
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 output.mp4
       ↓            ↓                  ↓             ↓
     输入文件      缩放滤镜          H.264编码     输出文件
```

### 2. 关键参数分类

#### **输入参数**
```bash
-i input.mp4          # 输入文件
-f avfoundation       # 指定输入格式（Mac 设备）
-re                   # 按实时速度读取（直播必需）
-stream_loop -1       # 循环播放（-1 无限循环）
```

#### **视频参数**
```bash
-c:v libx264          # 视频编码器（H.264）
-c:v copy             # 不重新编码，直接复制
-vf scale=1280:720    # 视频滤镜（缩放）
-r 30                 # 帧率 30fps
-b:v 2000k            # 视频码率 2Mbps
-preset ultrafast     # 编码速度预设
```

#### **音频参数**
```bash
-c:a aac              # 音频编码器（AAC）
-c:a copy             # 音频直接复制
-b:a 128k             # 音频码率 128kbps
-ar 44100             # 音频采样率
-an                   # 禁用音频
```

#### **输出参数**
```bash
-f flv                # 输出格式
-y                    # 覆盖输出文件（不询问）
```

---

## 🚀 常用命令速查

### 推流相关

#### 1. 推流到 RTMP 服务器
```bash
# 文件推流
ffmpeg -re -i video.mp4 -c copy -f flv rtmp://server/live/stream

# 摄像头推流
ffmpeg -f avfoundation -i "0:0" -c:v libx264 -f flv rtmp://server/live/stream

# 循环推流
ffmpeg -re -stream_loop -1 -i video.mp4 -c copy -f flv rtmp://server/live/stream
```

#### 2. 录制直播流
```bash
# 录制 RTMP 流
ffmpeg -i rtmp://server/live/stream -c copy output.mp4

# 录制指定时长（60秒）
ffmpeg -i rtmp://server/live/stream -t 60 -c copy output.mp4
```

### 转码相关

#### 1. 基础转码
```bash
# MP4 转 WebM
ffmpeg -i input.mp4 -c:v libvpx-vp9 -c:a libopus output.webm

# 转换编码格式
ffmpeg -i input.avi -c:v libx264 -c:a aac output.mp4
```

#### 2. 调整分辨率
```bash
# 缩放到 720p
ffmpeg -i input.mp4 -vf scale=1280:720 output.mp4

# 保持宽高比，宽度固定 1280
ffmpeg -i input.mp4 -vf scale=1280:-1 output.mp4
```

#### 3. 调整码率
```bash
# 固定码率 2Mbps
ffmpeg -i input.mp4 -b:v 2000k output.mp4

# 可变码率（质量优先）
ffmpeg -i input.mp4 -crf 23 -c:v libx264 output.mp4
# CRF 值越小质量越高（0-51，默认23）
```

#### 4. 调整帧率
```bash
# 转为 30fps
ffmpeg -i input.mp4 -r 30 output.mp4

# 转为 60fps（插帧）
ffmpeg -i input.mp4 -filter:v "minterpolate='fps=60'" output.mp4
```

### 提取/合并

#### 1. 提取音频
```bash
# 提取音频（保持原格式）
ffmpeg -i video.mp4 -vn -c:a copy audio.aac

# 提取并转为 MP3
ffmpeg -i video.mp4 -vn -c:a libmp3lame audio.mp3
```

#### 2. 提取视频
```bash
# 只保留视频（无音频）
ffmpeg -i input.mp4 -an -c:v copy video_only.mp4
```

#### 3. 合并音视频
```bash
# 音视频合并
ffmpeg -i video.mp4 -i audio.mp3 -c copy output.mp4

# 替换音频
ffmpeg -i video.mp4 -i new_audio.mp3 -map 0:v -map 1:a -c copy output.mp4
```

### 截图/截取

#### 1. 截图
```bash
# 截取第5秒的画面
ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 screenshot.jpg

# 每隔1秒截一张图
ffmpeg -i input.mp4 -vf fps=1 screenshot_%03d.jpg
```

#### 2. 截取视频片段
```bash
# 从第10秒开始，截取20秒
ffmpeg -i input.mp4 -ss 10 -t 20 -c copy output.mp4

# 截取特定时间段
ffmpeg -i input.mp4 -ss 00:01:30 -to 00:02:00 -c copy output.mp4
```

### 查看信息

#### 使用 ffprobe
```bash
# 查看文件详细信息
ffprobe input.mp4

# 只看关键信息
ffprobe -hide_banner input.mp4

# 查看流信息（直播）
ffprobe rtmp://server/live/stream

# 以 JSON 格式输出
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

---

## 🎓 进阶技巧

### 1. preset 预设详解

编码速度 vs 质量的平衡：

```bash
-preset ultrafast   # 最快，质量最差，文件最大
-preset superfast
-preset veryfast
-preset faster
-preset fast
-preset medium      # 默认，平衡
-preset slow
-preset slower
-preset veryslow    # 最慢，质量最好，文件最小
```

**直播推荐**：`ultrafast` 或 `veryfast`（减少延迟）  
**录播推荐**：`medium` 或 `slow`（提高质量）

### 2. CRF（恒定质量模式）

```bash
# CRF 值控制质量（H.264/H.265）
ffmpeg -i input.mp4 -c:v libx264 -crf 18 output.mp4

# CRF 范围：0-51
# 0   = 无损（文件巨大）
# 18  = 视觉无损（推荐高质量）
# 23  = 默认（平衡）
# 28  = 中低质量
# 51  = 最差质量
```

### 3. GOP（关键帧间隔）

```bash
# 设置 GOP 大小（影响延迟和快进性能）
ffmpeg -i input.mp4 -g 60 -c:v libx264 output.mp4

# -g 60 表示每60帧一个关键帧（I帧）
# GOP 越小：延迟越低，文件越大
# GOP 越大：延迟越高，文件越小

# 直播推荐：30-60（1-2秒）
# 点播推荐：120-300（4-10秒）
```

### 4. 多码率输出（自适应流）

```bash
# 同时输出多个码率
ffmpeg -i input.mp4 \
  -c:v libx264 -b:v 3000k -s 1920x1080 output_1080p.mp4 \
  -c:v libx264 -b:v 1500k -s 1280x720  output_720p.mp4 \
  -c:v libx264 -b:v 800k  -s 854x480   output_480p.mp4
```

### 5. 硬件加速

```bash
# Mac 使用 VideoToolbox 硬件编码
ffmpeg -i input.mp4 -c:v h264_videotoolbox -b:v 2000k output.mp4

# 查看支持的硬件编码器
ffmpeg -codecs | grep videotoolbox
```

---

## 🔍 常见问题诊断

### 问题1：推流延迟高

**解决方法**：
```bash
# 1. 使用 ultrafast preset
-preset ultrafast

# 2. 减小 GOP
-g 30

# 3. 减小缓冲区
-bufsize 512k

# 4. 禁用 B 帧
-bf 0

# 完整命令
ffmpeg -re -i input.mp4 \
  -c:v libx264 -preset ultrafast -g 30 -bf 0 \
  -bufsize 512k \
  -f flv rtmp://server/live/stream
```

### 问题2：推流卡顿

**原因**：编码速度跟不上实时速度

**解决方法**：
```bash
# 1. 降低分辨率
-vf scale=1280:720

# 2. 降低帧率
-r 25

# 3. 降低码率
-b:v 1500k

# 4. 使用更快的 preset
-preset ultrafast
```

### 问题3：文件太大

**解决方法**：
```bash
# 1. 使用 CRF 模式
-crf 28

# 2. 降低码率
-b:v 1000k

# 3. 使用 H.265 编码（压缩率更高）
-c:v libx265 -crf 28

# 4. 使用双遍编码（最优质量/大小比）
# 第一遍
ffmpeg -i input.mp4 -c:v libx264 -b:v 1000k -pass 1 -f null /dev/null
# 第二遍
ffmpeg -i input.mp4 -c:v libx264 -b:v 1000k -pass 2 output.mp4
```

---

## 📊 性能优化

### 1. 多线程编码

```bash
# 使用所有 CPU 核心
ffmpeg -i input.mp4 -threads 0 -c:v libx264 output.mp4

# 手动指定线程数
ffmpeg -i input.mp4 -threads 8 -c:v libx264 output.mp4
```

### 2. 批量处理

```bash
# 批量转码当前目录所有 MP4
for f in *.mp4; do
  ffmpeg -i "$f" -c:v libx264 -crf 23 "converted_${f}"
done

# 批量提取音频
for f in *.mp4; do
  ffmpeg -i "$f" -vn -c:a copy "${f%.mp4}.aac"
done
```

---

## 🎯 实战项目建议

### 项目1：直播推流优化
1. 对比不同 preset 的延迟和质量
2. 测试不同 GOP 对延迟的影响
3. 实现断线重连机制

### 项目2：视频处理工具
1. 做一个批量转码脚本
2. 自动生成多码率版本
3. 自动添加水印/片头片尾

### 项目3：监控录像系统
1. 定时录制摄像头
2. 自动分段（每小时一个文件）
3. 自动删除旧录像

---

## 📚 学习资源

### 官方文档
- [FFmpeg 官方文档](https://ffmpeg.org/documentation.html)
- [FFmpeg Wiki](https://trac.ffmpeg.org/wiki)
- [FFmpeg 参数速查](https://ffmpeg.org/ffmpeg.html)

### 推荐阅读
- [FFmpeg 编码指南](https://trac.ffmpeg.org/wiki/Encode/H.264)
- [理解视频编码](https://trac.ffmpeg.org/wiki/Encode/HighQualityAudio)

### 实践建议
1. **从简单开始**：先掌握基础转码和推流
2. **实际测试**：多试不同参数，观察效果
3. **查看日志**：FFmpeg 输出的日志很详细，仔细阅读
4. **阅读源码**：想深入理解可以看 FFmpeg 源码

---

## 🔥 常用命令模板

### 直播推流模板

```bash
# 【高质量】摄像头直播
ffmpeg -f avfoundation -framerate 30 -video_size 1920x1080 -i "0:0" \
  -c:v libx264 -preset medium -b:v 3000k -maxrate 3000k -bufsize 6000k \
  -g 60 -c:a aac -b:a 128k -ar 44100 \
  -f flv rtmp://server/live/stream

# 【低延迟】摄像头直播
ffmpeg -f avfoundation -framerate 30 -i "0:0" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -g 30 -bf 0 -bufsize 512k \
  -c:a aac -b:a 96k \
  -f flv rtmp://server/live/stream

# 【文件循环】推流
ffmpeg -re -stream_loop -1 -i video.mp4 \
  -c:v libx264 -preset veryfast -b:v 2000k \
  -c:a aac -b:a 128k \
  -f flv rtmp://server/live/stream
```

### 转码模板

```bash
# 【标准转码】MP4 优化
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 22 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4

# 【压缩视频】减小文件大小
ffmpeg -i input.mp4 \
  -vf scale=1280:720 \
  -c:v libx264 -crf 28 -preset medium \
  -c:a aac -b:a 96k \
  output.mp4

# 【GIF 转换】
ffmpeg -i input.mp4 \
  -vf "fps=15,scale=480:-1:flags=lanczos" \
  -c:v gif \
  output.gif
```

---

## 💡 小技巧

### 1. 查看编码进度
FFmpeg 会实时显示：
```
frame= 1234 fps= 30 q=28.0 size=  12345kB time=00:01:23.45 bitrate=1234.5kbits/s
```
- `frame`: 已编码帧数
- `fps`: 编码速度（帧/秒）
- `time`: 已处理时长
- `bitrate`: 当前码率

### 2. 静默模式
```bash
# 只显示错误
ffmpeg -loglevel error -i input.mp4 output.mp4

# 完全静默
ffmpeg -loglevel quiet -i input.mp4 output.mp4

# 显示进度条
ffmpeg -progress - -i input.mp4 output.mp4
```

### 3. 快速测试
```bash
# 只处理前 10 秒
ffmpeg -i input.mp4 -t 10 -c:v libx264 test.mp4

# 从第 30 秒开始处理
ffmpeg -i input.mp4 -ss 30 -c:v libx264 output.mp4
```

---

**记住**：FFmpeg 是一个工具，熟练掌握需要大量实践。先掌握常用命令，遇到问题时再查文档深入学习！🚀
