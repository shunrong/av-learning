/**
 * Mock ASR (自动语音识别) 服务
 * 模拟真实的语音识别服务，返回随机文本
 * 后期可以替换为真实的阿里云/讯飞等服务
 */

class MockASRService {
  constructor() {
    // Mock文本库 - 模拟识别结果
    this.mockTexts = [
      "今天天气真不错",
      "我正在学习音视频技术",
      "实时语音识别非常有趣",
      "WebSocket连接很稳定",
      "这是一个测试句子",
      "语音转文字的准确率很高",
      "前端开发越来越有意思了",
      "学习新技术需要不断实践",
      "音视频领域有很多值得探索的地方",
      "希望这个项目能帮助大家学习",
      "实时通信技术在现代应用中很重要",
      "WebRTC和WebSocket各有用途",
      "用户体验是产品的核心",
      "技术服务于业务场景",
      "持续学习才能跟上技术发展",
      "好的代码需要良好的架构",
      "模块化设计让代码更易维护",
      "测试是保证质量的重要环节",
      "性能优化要找到关键瓶颈",
      "简洁的代码就是最好的文档"
    ];
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      totalAudioChunks: 0,
      startTime: Date.now()
    };
  }

  /**
   * 处理音频数据（Mock版本）
   * @param {Buffer} audioData - 音频数据
   * @returns {Promise<Object>} 识别结果
   */
  async processAudio(audioData) {
    this.stats.totalRequests++;
    this.stats.totalAudioChunks++;

    // 模拟识别延迟 200-500ms
    const delay = this.getRandomDelay(200, 500);
    await this.sleep(delay);

    // 随机决定是返回临时结果还是最终结果
    const isFinal = Math.random() > 0.7; // 30%概率是最终结果

    return {
      text: this.getRandomText(),
      isFinal: isFinal,
      confidence: this.getRandomConfidence(),
      timestamp: Date.now()
    };
  }

  /**
   * 获取随机文本
   */
  getRandomText() {
    const index = Math.floor(Math.random() * this.mockTexts.length);
    return this.mockTexts[index];
  }

  /**
   * 获取随机置信度
   */
  getRandomConfidence() {
    // 返回 0.85 - 0.99 之间的置信度
    return (0.85 + Math.random() * 0.14).toFixed(2);
  }

  /**
   * 获取随机延迟
   */
  getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      totalAudioChunks: 0,
      startTime: Date.now()
    };
  }
}

module.exports = MockASRService;

