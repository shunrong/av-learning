# 接入真实ASR服务指南

本指南介绍如何将Mock ASR替换为真实的语音识别服务，包括阿里云、讯飞、腾讯云等主流平台。

## 🎯 总体思路

本项目的核心架构已经完成，只需要替换 `MockASRService` 为真实的ASR服务即可。所有的WebSocket通信、音频采集、UI展示都不需要修改。

## 📋 通用接入步骤

### 1. 选择ASR服务商

| 服务商 | 产品名称 | 特点 | 价格 |
|-------|---------|------|------|
| 阿里云 | 智能语音交互 | 准确率高，支持多种场景 | 按时长计费 |
| 讯飞 | 实时语音转写 | 方言支持好，专业领域强 | 按调用次数 |
| 腾讯云 | 实时语音识别 | 微信生态集成好 | 按时长计费 |
| Azure | Speech to Text | 多语言支持，全球部署 | 按时长计费 |

### 2. 注册账号并开通服务

1. 注册账号
2. 实名认证
3. 开通语音识别服务
4. 获取API密钥（AppKey、AppSecret等）

### 3. 了解API接口

大多数ASR服务提供两种接口：

**REST API**（推荐用于学习）:
- 简单易用
- 适合非实时场景
- HTTP请求/响应

**WebSocket API**（推荐用于生产）:
- 真正的实时识别
- 双向通信
- 低延迟

## 🌟 方案一：阿里云智能语音

### 1. 准备工作

```bash
npm install alibabacloud-nls-filetrans20180817
```

### 2. 获取凭证

登录阿里云控制台：
- 访问: https://ai.aliyun.com/nls
- 开通服务
- 获取 AppKey 和 Token

### 3. 实现AlibabaASRService

创建 `server/AlibabaASRService.js`:

```javascript
const NlsClient = require('alibabacloud-nls-filetrans20180817');

class AlibabaASRService {
  constructor(config) {
    this.appKey = config.appKey;
    this.token = config.token;
    this.wsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';
    
    this.stats = {
      totalRequests: 0,
      totalAudioChunks: 0,
      startTime: Date.now()
    };
  }

  /**
   * 建立WebSocket连接
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const url = `${this.wsUrl}?appkey=${this.appKey}&token=${this.token}`;
      
      this.ws = new WebSocket(url);
      
      this.ws.on('open', () => {
        console.log('✅ 阿里云ASR连接成功');
        
        // 发送启动参数
        this.ws.send(JSON.stringify({
          header: {
            message_id: this.generateMessageId(),
            task_id: this.generateTaskId(),
            namespace: 'SpeechTranscriber',
            name: 'StartTranscription',
            appkey: this.appKey
          },
          payload: {
            format: 'opus',
            sample_rate: 16000,
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true
          }
        }));
        
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('❌ 阿里云ASR错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 处理阿里云返回的消息
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      const { header, payload } = message;

      if (header.name === 'TranscriptionResultChanged') {
        // 临时结果
        this.onResult({
          text: payload.result,
          isFinal: false,
          confidence: 0.90,
          timestamp: Date.now()
        });
      } else if (header.name === 'SentenceEnd') {
        // 最终结果
        this.onResult({
          text: payload.result,
          isFinal: true,
          confidence: 0.95,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('❌ 解析阿里云消息失败:', error);
    }
  }

  /**
   * 发送音频数据
   */
  async processAudio(audioData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    this.stats.totalRequests++;
    this.stats.totalAudioChunks++;

    // 发送音频数据
    this.ws.send(audioData);
  }

  /**
   * 停止识别
   */
  stop() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 发送停止命令
      this.ws.send(JSON.stringify({
        header: {
          message_id: this.generateMessageId(),
          task_id: this.taskId,
          namespace: 'SpeechTranscriber',
          name: 'StopTranscription',
          appkey: this.appKey
        }
      }));

      this.ws.close();
    }
  }

  /**
   * 设置结果回调
   */
  setOnResult(callback) {
    this.onResult = callback;
  }

  /**
   * 生成消息ID
   */
  generateMessageId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    this.taskId = Date.now().toString();
    return this.taskId;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const runningTime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    return {
      ...this.stats,
      runningTime: `${runningTime}秒`,
      avgRequestsPerSecond: (this.stats.totalRequests / runningTime).toFixed(2)
    };
  }
}

module.exports = AlibabaASRService;
```

### 4. 修改server.js

```javascript
// const MockASRService = require('./MockASRService');
const AlibabaASRService = require('./AlibabaASRService');

// 配置阿里云凭证
const asrConfig = {
  appKey: process.env.ALI_APP_KEY || 'your-app-key',
  token: process.env.ALI_TOKEN || 'your-token'
};

// 创建ASR服务实例
const asrService = new AlibabaASRService(asrConfig);

// 设置结果回调
asrService.setOnResult((result) => {
  // 发送给对应的客户端
  if (currentClient) {
    currentClient.ws.send(JSON.stringify({
      type: 'result',
      data: result
    }));
  }
});
```

### 5. 环境变量配置

创建 `.env` 文件：

```env
ALI_APP_KEY=your_app_key_here
ALI_TOKEN=your_token_here
```

## 🌟 方案二：讯飞开放平台

### 1. 准备工作

```bash
npm install ws crypto
```

### 2. 实现XunfeiASRService

创建 `server/XunfeiASRService.js`:

```javascript
const WebSocket = require('ws');
const crypto = require('crypto');

class XunfeiASRService {
  constructor(config) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.wsUrl = 'wss://rtasr.xfyun.cn/v1/ws';
  }

  /**
   * 生成鉴权URL
   */
  getAuthUrl() {
    const date = new Date().toUTCString();
    const signatureOrigin = `host: rtasr.xfyun.cn\ndate: ${date}\nGET /v1/ws HTTP/1.1`;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signatureOrigin)
      .digest('base64');
    
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    return `${this.wsUrl}?authorization=${authorization}&date=${date}&host=rtasr.xfyun.cn`;
  }

  /**
   * 建立连接
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const url = this.getAuthUrl();
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ 讯飞ASR连接成功');
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', reject);
    });
  }

  /**
   * 处理讯飞返回的消息
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.action === 'result') {
        const result = message.data;
        
        this.onResult({
          text: result.cn.st.rt[0].ws.map(w => w.cw[0].w).join(''),
          isFinal: result.cn.st.type === 0,
          confidence: result.cn.st.rt[0].ws[0].cw[0].wp || 0.90,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('❌ 解析讯飞消息失败:', error);
    }
  }

  /**
   * 发送音频数据
   */
  async processAudio(audioData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // 讯飞要求发送的数据格式
    const frame = {
      data: audioData.toString('base64')
    };

    this.ws.send(JSON.stringify(frame));
  }

  /**
   * 设置结果回调
   */
  setOnResult(callback) {
    this.onResult = callback;
  }
}

module.exports = XunfeiASRService;
```

## 🌟 方案三：腾讯云语音识别

### 1. 准备工作

```bash
npm install tencentcloud-sdk-nodejs
```

### 2. 实现TencentASRService

```javascript
const tencentcloud = require('tencentcloud-sdk-nodejs');
const AsrClient = tencentcloud.asr.v20190614.Client;

class TencentASRService {
  constructor(config) {
    this.client = new AsrClient({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'asr.tencentcloudapi.com'
        }
      }
    });
  }

  async processAudio(audioData) {
    const params = {
      EngineModelType: '16k_zh',
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 1,
      Data: audioData.toString('base64')
    };

    try {
      const response = await this.client.SentenceRecognition(params);
      
      return {
        text: response.Result,
        isFinal: true,
        confidence: 0.95,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ 腾讯云ASR错误:', error);
      throw error;
    }
  }
}

module.exports = TencentASRService;
```

## 🔧 通用适配层

为了方便切换不同的ASR服务，可以创建一个通用的适配层：

```javascript
// server/ASRFactory.js
class ASRFactory {
  static create(provider, config) {
    switch (provider) {
      case 'alibaba':
        return new AlibabaASRService(config);
      case 'xunfei':
        return new XunfeiASRService(config);
      case 'tencent':
        return new TencentASRService(config);
      case 'mock':
      default:
        return new MockASRService();
    }
  }
}

// 使用
const asrService = ASRFactory.create(
  process.env.ASR_PROVIDER || 'mock',
  {
    appKey: process.env.ASR_APP_KEY,
    // ...其他配置
  }
);
```

## 📊 对比总结

### 接口类型

| 服务商 | WebSocket | REST API | SDK |
|-------|-----------|----------|-----|
| 阿里云 | ✅ | ✅ | ✅ |
| 讯飞 | ✅ | ✅ | ✅ |
| 腾讯云 | ✅ | ✅ | ✅ |
| Azure | ✅ | ✅ | ✅ |

### 音频格式支持

| 服务商 | Opus | PCM | MP3 | WAV |
|-------|------|-----|-----|-----|
| 阿里云 | ✅ | ✅ | ✅ | ✅ |
| 讯飞 | ✅ | ✅ | ✅ | ✅ |
| 腾讯云 | ❌ | ✅ | ✅ | ✅ |
| Azure | ✅ | ✅ | ✅ | ✅ |

### 功能对比

| 功能 | 阿里云 | 讯飞 | 腾讯云 | Azure |
|------|--------|------|--------|-------|
| 实时识别 | ✅ | ✅ | ✅ | ✅ |
| 临时结果 | ✅ | ✅ | ✅ | ✅ |
| 标点符号 | ✅ | ✅ | ✅ | ✅ |
| 数字转换 | ✅ | ✅ | ✅ | ✅ |
| 方言识别 | 有限 | ✅ | 有限 | ❌ |
| 热词定制 | ✅ | ✅ | ✅ | ✅ |
| 说话人分离 | ✅ | ❌ | ✅ | ✅ |

## 💰 成本估算

### 阿里云（按时长）
- 免费额度: 每月前3000分钟
- 超出部分: ¥0.018/分钟

### 讯飞（按调用）
- 免费额度: 每日500次
- 超出部分: ¥0.05/次

### 腾讯云（按时长）
- 免费额度: 每月前30000分钟
- 超出部分: ¥0.015/分钟

### Azure（按时长）
- 免费额度: 每月前5小时
- 超出部分: $1/小时

## 🎯 推荐方案

### 学习阶段
- **推荐**: Mock ASR（本项目自带）
- **原因**: 免费、快速、专注于架构学习

### 原型开发
- **推荐**: 阿里云或腾讯云
- **原因**: 免费额度大、文档齐全、国内访问快

### 生产环境
- **推荐**: 根据业务场景选择
  - **通用场景**: 阿里云（准确率高）
  - **方言场景**: 讯飞（方言支持好）
  - **微信生态**: 腾讯云（集成方便）
  - **国际化**: Azure（多语言支持）

## 📝 接入检查清单

- [ ] 注册服务商账号
- [ ] 开通语音识别服务
- [ ] 获取API凭证
- [ ] 安装对应的SDK
- [ ] 实现ASRService类
- [ ] 修改server.js引用
- [ ] 配置环境变量
- [ ] 测试连接和识别
- [ ] 处理错误和异常
- [ ] 监控使用量和成本

## 🔍 调试建议

1. **先用Mock测试**: 确保基础架构正常
2. **逐步替换**: 一步步接入真实服务
3. **日志记录**: 详细记录请求和响应
4. **错误处理**: 完善各种异常情况
5. **性能监控**: 关注延迟和准确率

## 📚 参考文档

- [阿里云智能语音](https://help.aliyun.com/product/30413.html)
- [讯飞开放平台](https://www.xfyun.cn/doc/asr/rtasr/API.html)
- [腾讯云语音识别](https://cloud.tencent.com/document/product/1093)
- [Azure Speech Services](https://learn.microsoft.com/zh-cn/azure/cognitive-services/speech-service/)

