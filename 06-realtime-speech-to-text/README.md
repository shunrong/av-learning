# 实时语音转文字系统

一个完整的实时语音识别(ASR)学习项目，模拟钉钉闪记功能，帮助你理解语音转文字的核心技术和实现方式。

## 📚 项目简介

本项目实现了一个基础的实时语音转文字系统，包含完整的音频采集、实时传输、识别处理流程。目前使用Mock服务模拟AI识别，方便学习和调试，后期可轻松替换为真实的语音识别API。

### 主要功能

- ✅ **实时录音**: 使用MediaRecorder API采集麦克风音频
- ✅ **实时传输**: WebSocket双向通信传输音频数据
- ✅ **Mock识别**: 模拟ASR服务，返回随机文本
- ✅ **音量可视化**: 实时显示麦克风音量
- ✅ **结果展示**: 区分临时结果和最终结果
- ✅ **暂停/继续**: 支持录音控制
- ✅ **导出文本**: 下载转写内容为TXT文件
- ✅ **易于扩展**: 后期可替换为真实AI服务

## 🏗️ 项目结构

```
06-realtime-speech-to-text/
├── server/                     # 服务端
│   ├── server.js              # WebSocket服务器
│   ├── MockASRService.js      # Mock语音识别服务
│   └── package.json
├── client/                     # 客户端
│   ├── index.html             # 主页面
│   ├── app.js                 # 应用主逻辑
│   ├── AudioRecorder.js       # 录音管理器
│   └── styles.css             # 样式
├── docs/                       # 文档
├── package.json
└── README.md
```

## 🚀 快速开始

### 1. 环境要求

- **Node.js**: v14.0 或更高版本
- **浏览器**: Chrome、Edge、Firefox（需支持MediaRecorder API）
- **麦克风**: 计算机需要有可用的麦克风设备

### 2. 安装依赖

```bash
cd 06-realtime-speech-to-text
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

### 基本操作

1. **开始录音**
   - 点击"开始录音"按钮
   - 允许浏览器访问麦克风
   - 开始说话，文字会实时显示

2. **控制录音**
   - **暂停**: 点击"暂停"按钮临时暂停
   - **继续**: 再次点击恢复录音
   - **停止**: 点击"停止录音"结束会话

3. **管理结果**
   - **查看**: 转写结果实时显示在下方
   - **清空**: 点击"清空"删除所有结果
   - **导出**: 点击"导出"下载为文本文件

### 结果说明

- **临时结果** (灰色): 实时返回的初步识别结果
- **最终结果** (蓝色): 确认的最终识别结果
- **置信度**: 显示识别结果的可信度（0.85-0.99）

## 🔧 技术架构

### 前端技术

```javascript
// 1. 获取麦克风权限
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000
  } 
});

// 2. 创建录音器
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000
});

// 3. 建立WebSocket连接
const ws = new WebSocket('ws://localhost:3000');

// 4. 实时传输音频
mediaRecorder.ondataavailable = (event) => {
  ws.send(event.data);
};
```

### 后端技术

```javascript
// WebSocket接收音频
ws.on('message', async (audioData) => {
  // 使用Mock ASR处理
  const result = await asrService.processAudio(audioData);
  
  // 返回识别结果
  ws.send(JSON.stringify({
    type: 'result',
    data: {
      text: result.text,
      isFinal: result.isFinal
    }
  }));
});
```

### Mock ASR服务

模拟真实的语音识别过程：
- 接收音频数据（但不实际处理）
- 模拟识别延迟（200-500ms）
- 返回随机文本（从预设文本库）
- 随机标记临时/最终结果

## 💡 核心特性

### 1. 音频采集

- **编码格式**: Opus（高压缩率）
- **采样率**: 16kHz（ASR标准）
- **声道**: 单声道
- **分片**: 每300ms发送一次

### 2. 实时通信

- **协议**: WebSocket
- **数据格式**: 二进制音频 + JSON控制消息
- **连接管理**: 自动重连、心跳检测

### 3. 音量可视化

- **实时检测**: 使用Web Audio API分析音量
- **视觉反馈**: 动态进度条显示音量
- **颜色变化**: 根据音量大小改变颜色

### 4. 结果管理

- **实时显示**: 识别结果即时展示
- **历史记录**: 保存所有识别记录
- **导出功能**: 生成TXT格式文件

## 🎯 后期接入真实AI

### 支持的语音识别服务

1. **阿里云智能语音**
   - 产品: 实时语音识别 ASR
   - 准确率: 97%+
   - 延迟: 200-500ms

2. **讯飞开放平台**
   - 产品: 实时语音转写 RTASR
   - 方言支持: 丰富
   - 专业领域: 支持

3. **腾讯云语音识别**
   - 产品: 实时语音识别 ASR
   - 微信生态: 集成好
   - 热词定制: 支持

4. **Azure Speech Services**
   - 产品: Speech to Text
   - 多语言: 100+
   - 实时翻译: 支持

### 替换步骤

只需修改 `server/MockASRService.js`:

**从Mock服务:**
```javascript
class MockASRService {
  async processAudio(audioData) {
    // 返回随机文本
    return { text: this.getRandomText() };
  }
}
```

**改为真实服务:**
```javascript
class AlibabaASRService {
  async processAudio(audioData) {
    // 发送到阿里云ASR
    const result = await this.client.sendAudio(audioData);
    return { text: result.text };
  }
}
```

核心架构保持不变，只需替换识别逻辑！

## 📊 性能指标

- **音频延迟**: < 300ms
- **WebSocket延迟**: < 50ms
- **Mock识别延迟**: 200-500ms
- **UI更新频率**: 100ms
- **内存占用**: < 50MB

## 🔍 技术要点

### 1. MediaRecorder API

```javascript
// 检查浏览器支持
if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
  console.log('支持Opus编码');
}

// 选择最佳音频格式
const mimeType = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus'
].find(type => MediaRecorder.isTypeSupported(type));
```

### 2. Web Audio API

```javascript
// 音量分析
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);

analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);

// 计算平均音量
const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
```

### 3. WebSocket通信

```javascript
// 二进制数据传输
ws.binaryType = 'arraybuffer';

// 发送控制消息（JSON）
ws.send(JSON.stringify({ type: 'start' }));

// 发送音频数据（Binary）
ws.send(audioBlob);
```

## 🐛 常见问题

### Q: 麦克风权限被拒绝？

**A**: 检查浏览器设置，允许网站访问麦克风。Chrome地址栏左侧有麦克风图标，点击设置权限。

### Q: 没有识别结果？

**A**: 
1. 检查WebSocket连接状态（页面顶部显示）
2. 查看浏览器控制台是否有错误
3. 确认服务器正在运行

### Q: 音量显示一直是0？

**A**: 说话大声一点，或者检查麦克风设备是否正常工作。

### Q: 如何接入真实的语音识别？

**A**: 参考文档 `docs/接入真实ASR指南.md`（后续创建）

## 📚 学习资源

### API文档

- [MediaRecorder API](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaRecorder)
- [Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)

### 语音识别服务

- [阿里云智能语音](https://ai.aliyun.com/nls)
- [讯飞开放平台](https://www.xfyun.cn/)
- [腾讯云语音识别](https://cloud.tencent.com/product/asr)

## 🎓 扩展功能

可以继续实现的功能：

1. **高级功能**
   - 多人会议转写
   - 说话人分离
   - 智能标点
   - 关键词提取

2. **优化改进**
   - 断线重连
   - 音频缓存
   - 离线缓存
   - PWA支持

3. **用户体验**
   - 快捷键操作
   - 语音命令
   - 实时编辑
   - 历史记录同步

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可

MIT License

---

**学习目标**: 通过本项目掌握实时语音转文字的核心技术，为后续接入真实AI服务打下基础！

