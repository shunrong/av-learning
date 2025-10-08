/**
 * 音频录制管理器
 * 负责麦克风采集、音频编码、数据传输
 */

class AudioRecorder {
  constructor(onDataAvailable, onVolumeChange) {
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    
    this.onDataAvailable = onDataAvailable; // 音频数据回调
    this.onVolumeChange = onVolumeChange;   // 音量变化回调
    
    this.isRecording = false;
    this.volumeCheckInterval = null;
  }

  /**
   * 初始化录音器
   */
  async init() {
    try {
      // 请求麦克风权限
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,      // 回声消除
          noiseSuppression: true,      // 降噪
          autoGainControl: true,       // 自动增益
          sampleRate: 16000            // 采样率 16kHz（ASR标准）
        }
      });

      // 创建MediaRecorder
      const options = {
        mimeType: this.getSupportedMimeType(),
        audioBitsPerSecond: 16000
      };

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.onDataAvailable) {
          this.onDataAvailable(event.data);
        }
      };

      // 初始化音量分析器
      this.initVolumeAnalyser();

      console.log('✅ 录音器初始化成功');
      console.log('   - 音频格式:', options.mimeType);
      console.log('   - 采样率: 16kHz');
      console.log('   - 码率:', options.audioBitsPerSecond);

      return true;
    } catch (error) {
      console.error('❌ 录音器初始化失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 初始化音量分析器
   */
  initVolumeAnalyser() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (error) {
      console.warn('⚠️ 音量分析器初始化失败:', error);
    }
  }

  /**
   * 开始录音
   */
  start() {
    if (!this.mediaRecorder) {
      throw new Error('录音器未初始化');
    }

    if (this.isRecording) {
      console.warn('⚠️ 录音已在进行中');
      return;
    }

    // 每300ms发送一次音频数据
    this.mediaRecorder.start(300);
    this.isRecording = true;

    // 启动音量监测
    this.startVolumeMonitoring();

    console.log('🎤 开始录音');
  }

  /**
   * 停止录音
   */
  stop() {
    if (!this.isRecording) {
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.isRecording = false;
    this.stopVolumeMonitoring();

    console.log('🛑 停止录音');
  }

  /**
   * 暂停录音
   */
  pause() {
    if (this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.stopVolumeMonitoring();
      console.log('⏸️ 暂停录音');
    }
  }

  /**
   * 恢复录音
   */
  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.startVolumeMonitoring();
      console.log('▶️ 恢复录音');
    }
  }

  /**
   * 开始音量监测
   */
  startVolumeMonitoring() {
    if (!this.analyser) return;

    this.volumeCheckInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // 计算平均音量
      const sum = this.dataArray.reduce((a, b) => a + b, 0);
      const average = sum / this.dataArray.length;
      const volume = Math.min(100, Math.floor((average / 255) * 100));

      if (this.onVolumeChange) {
        this.onVolumeChange(volume);
      }
    }, 100); // 每100ms更新一次
  }

  /**
   * 停止音量监测
   */
  stopVolumeMonitoring() {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
      
      if (this.onVolumeChange) {
        this.onVolumeChange(0);
      }
    }
  }

  /**
   * 释放资源
   */
  destroy() {
    this.stop();
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }

    console.log('🗑️ 录音器已销毁');
  }

  /**
   * 获取支持的音频格式
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // 使用浏览器默认格式
  }

  /**
   * 错误处理
   */
  handleError(error) {
    let message = '录音失败';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      message = '麦克风权限被拒绝，请允许访问麦克风';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      message = '未找到麦克风设备';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      message = '麦克风被其他应用占用';
    } else {
      message = `录音错误: ${error.message}`;
    }

    return new Error(message);
  }

  /**
   * 检查浏览器支持
   */
  static isSupported() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.MediaRecorder);
  }

  /**
   * 获取录音状态
   */
  getState() {
    return {
      isRecording: this.isRecording,
      recorderState: this.mediaRecorder ? this.mediaRecorder.state : 'inactive'
    };
  }
}

