# 视频点播系统 (VOD System)

一个完整的视频点播学习项目，包含视频上传、转码、存储、播放等核心功能。

## 📚 项目简介

本项目实现了一个基础的视频点播(Video On Demand)系统，帮助你理解视频点播的核心技术和实现方式。

### 主要功能

- ✅ **视频上传**: 支持多种视频格式上传
- ✅ **自动转码**: 使用FFmpeg转码为HLS格式
- ✅ **缩略图生成**: 自动生成视频预览图
- ✅ **视频播放**: 支持HLS流媒体和原始格式播放
- ✅ **视频管理**: 视频列表、详情查看、删除功能
- ✅ **元数据管理**: 存储和管理视频元信息

## 🏗️ 项目结构

```
05-vod-system/
├── server/                 # 服务端
│   ├── server.js          # Express服务器
│   ├── VideoManager.js    # 视频管理核心类
│   └── routes/            # API路由
│       ├── upload.js      # 上传接口
│       └── video.js       # 视频CRUD接口
├── client/                 # 客户端
│   ├── index.html         # 视频列表页
│   ├── player.html        # 播放器页面
│   ├── app.js            # 列表页逻辑
│   ├── player.js         # 播放器逻辑
│   └── styles.css        # 样式文件
├── media/                  # 媒体文件目录
│   ├── videos/           # 原始视频存储
│   ├── hls/              # HLS切片文件
│   ├── thumbnails/       # 缩略图
│   └── videos.json       # 视频元数据
├── package.json
└── README.md
```

## 🚀 快速开始

### 1. 环境要求

- **Node.js**: v14.0 或更高版本
- **FFmpeg**: 必须安装并配置到环境变量

#### 安装FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
从 [FFmpeg官网](https://ffmpeg.org/download.html) 下载并添加到PATH

验证安装：
```bash
ffmpeg -version
```

### 2. 安装依赖

```bash
cd 05-vod-system
npm install
```

### 3. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：
```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问: http://localhost:3000

## 📖 使用指南

### 上传视频

1. 在首页点击"选择视频文件"
2. 选择一个视频文件（支持mp4、avi、mov等格式）
3. 填写视频标题和描述（可选）
4. 点击"上传视频"按钮
5. 等待上传和处理完成

### 观看视频

1. 在视频列表中点击任意视频卡片
2. 系统会自动使用HLS格式播放
3. 可以切换到"播放格式"标签选择原始视频格式
4. 查看"技术参数"了解播放统计信息

### 删除视频

1. 进入视频播放页面
2. 点击页面底部的"删除视频"按钮
3. 确认删除操作

## 🔧 技术架构

### 后端技术栈

- **Express**: Web服务器框架
- **Multer**: 处理文件上传
- **fluent-ffmpeg**: FFmpeg的Node.js封装
- **UUID**: 生成唯一视频ID

### 前端技术栈

- **原生HTML/CSS/JS**: 无框架依赖
- **hls.js**: HLS流媒体播放库
- **Fetch API**: HTTP请求

### 视频处理流程

```
1. 用户上传视频
   ↓
2. 保存到临时目录
   ↓
3. 生成UUID和元数据
   ↓
4. 移动到videos目录
   ↓
5. FFmpeg获取视频信息
   ↓
6. FFmpeg转码为HLS
   ↓
7. FFmpeg生成缩略图
   ↓
8. 更新元数据状态为ready
   ↓
9. 用户可以播放
```

## 💡 核心概念

### 什么是点播(VOD)?

点播(Video On Demand)是指用户可以随时选择和观看已存储的视频内容，与直播(Live)相对。

**特点:**
- 视频预先存储在服务器
- 用户可以暂停、快进、后退
- 支持随机访问任意时间点
- 可以反复观看

### HLS技术

HLS (HTTP Live Streaming) 是Apple开发的流媒体传输协议。

**工作原理:**
1. 将视频切分成多个小片段（通常10秒）
2. 生成一个索引文件（.m3u8）记录所有片段
3. 客户端按顺序下载和播放这些片段

**优势:**
- 基于HTTP，兼容性好
- 支持自适应码率（ABR）
- 可以使用CDN加速
- 易于实现加密和DRM

### 视频转码

转码是将视频从一种格式转换为另一种格式的过程。

**为什么要转码?**
- 兼容性：确保所有设备都能播放
- 压缩：减小文件大小，节省带宽
- 自适应：提供多种码率适配不同网络
- 格式统一：便于统一管理

## 📊 API接口文档

### 上传视频

```
POST /api/upload
Content-Type: multipart/form-data

参数:
- video: File (必需) - 视频文件
- title: String (可选) - 视频标题
- description: String (可选) - 视频描述

响应:
{
  "success": true,
  "message": "视频上传成功，正在处理中...",
  "data": {
    "id": "uuid",
    "title": "视频标题",
    "status": "processing",
    ...
  }
}
```

### 获取视频列表

```
GET /api/videos

响应:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "视频标题",
      "status": "ready",
      "formats": {
        "original": "/media/videos/xxx.mp4",
        "hls": "/media/hls/uuid/playlist.m3u8",
        "thumbnail": "/media/thumbnails/uuid.jpg"
      },
      ...
    }
  ]
}
```

### 获取单个视频

```
GET /api/videos/:id

响应:
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "视频标题",
    ...
  }
}
```

### 删除视频

```
DELETE /api/videos/:id

响应:
{
  "success": true,
  "message": "视频删除成功"
}
```

## 🎯 学习要点

### 1. 文件上传

- 使用multer处理multipart/form-data
- 文件大小限制
- 文件类型验证
- 临时文件管理

### 2. 视频处理

- FFmpeg命令行使用
- 获取视频元信息（ffprobe）
- 视频转码参数
- 生成视频截图

### 3. HLS流媒体

- M3U8播放列表格式
- TS视频切片
- hls.js的使用
- 自适应码率切换

### 4. 存储管理

- 文件系统操作
- 目录结构设计
- 元数据持久化
- 文件清理策略

### 5. 前端播放

- HTML5 Video API
- hls.js集成
- 播放控制
- 播放统计

## 🔍 进阶扩展

### 可以继续实现的功能

1. **多码率转码**
   - 生成360p、720p、1080p多个版本
   - 实现真正的自适应码率

2. **视频剪辑**
   - 在线裁剪视频
   - 添加水印
   - 视频拼接

3. **CDN集成**
   - 对接OSS存储
   - 使用CDN加速分发

4. **用户系统**
   - 用户认证
   - 权限控制
   - 观看历史

5. **视频加密**
   - HLS-AES加密
   - Token验证
   - 防盗链

6. **弹幕系统**
   - 实时弹幕
   - 弹幕管理

7. **推荐系统**
   - 相关视频推荐
   - 热门视频

## 🐛 常见问题

### Q: FFmpeg未找到

**A:** 确保FFmpeg已安装并添加到系统PATH环境变量中。

### Q: 视频上传后一直显示"处理中"

**A:** 
- 检查服务器控制台是否有错误信息
- 确认FFmpeg工作正常
- 检查视频文件是否损坏

### Q: HLS视频无法播放

**A:** 
- 检查浏览器控制台错误
- 确认HLS文件已生成（media/hls目录）
- 尝试使用原始格式播放

### Q: 上传大文件失败

**A:** 
- 检查multer的fileSize限制
- 调整Express的body-parser限制
- 考虑使用分片上传

## 📚 参考资料

- [FFmpeg官方文档](https://ffmpeg.org/documentation.html)
- [HLS规范](https://datatracker.ietf.org/doc/html/rfc8216)
- [hls.js文档](https://github.com/video-dev/hls.js/)
- [HTML5 Video](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/video)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可

MIT License

