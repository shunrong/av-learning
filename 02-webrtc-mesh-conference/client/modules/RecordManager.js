/**
 * 录制管理器
 * 负责会议录制功能
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';

export class RecordManager extends EventEmitter {
  constructor() {
    super();
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.recordingStream = null;
  }

  /**
   * 开始录制
   * @param {MediaStream} stream - 要录制的媒体流
   * @param {Object} options - 录制选项
   */
  startRecording(stream, options = {}) {
    if (this.isRecording) {
      logger.warn('已经在录制中');
      return false;
    }

    if (!stream || stream.getTracks().length === 0) {
      logger.error('没有可录制的媒体流');
      throw new Error('没有可录制的媒体流');
    }

    try {
      this.recordedChunks = [];
      this.recordingStream = stream;

      // 配置录制选项
      const mimeType = this._getSupportedMimeType();
      const recordOptions = {
        mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond || 2500000, // 2.5 Mbps
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,  // 128 kbps
        ...options
      };

      logger.info('开始录制，MIME 类型:', mimeType);
      logger.debug('录制选项:', recordOptions);

      this.mediaRecorder = new MediaRecorder(stream, recordOptions);

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          logger.debug(`录制数据块: ${event.data.size} bytes`);
        }
      };

      // 监听录制停止事件
      this.mediaRecorder.onstop = () => {
        logger.info('录制已停止');
        this._handleRecordingStop();
      };

      // 监听错误事件
      this.mediaRecorder.onerror = (event) => {
        logger.error('录制错误:', event.error);
        this.emit('error', { type: 'recording-error', error: event.error });
      };

      // 开始录制（每秒触发一次 dataavailable）
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.startTime = Date.now();

      logger.info('✅ 录制已开始');
      this.emit('recording-started', { startTime: this.startTime });
      return true;
    } catch (error) {
      logger.error('开始录制失败:', error);
      this.emit('error', { type: 'start-recording-failed', error });
      throw error;
    }
  }

  /**
   * 停止录制
   */
  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      logger.warn('当前没有在录制');
      return false;
    }

    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      logger.info('录制停止指令已发送');
      return true;
    } catch (error) {
      logger.error('停止录制失败:', error);
      this.emit('error', { type: 'stop-recording-failed', error });
      return false;
    }
  }

  /**
   * 暂停录制
   */
  pauseRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      logger.warn('当前没有在录制');
      return false;
    }

    if (this.mediaRecorder.state === 'paused') {
      logger.warn('录制已经暂停');
      return false;
    }

    try {
      this.mediaRecorder.pause();
      logger.info('录制已暂停');
      this.emit('recording-paused');
      return true;
    } catch (error) {
      logger.error('暂停录制失败:', error);
      return false;
    }
  }

  /**
   * 恢复录制
   */
  resumeRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      logger.warn('当前没有在录制');
      return false;
    }

    if (this.mediaRecorder.state !== 'paused') {
      logger.warn('录制未暂停');
      return false;
    }

    try {
      this.mediaRecorder.resume();
      logger.info('录制已恢复');
      this.emit('recording-resumed');
      return true;
    } catch (error) {
      logger.error('恢复录制失败:', error);
      return false;
    }
  }

  /**
   * 处理录制停止
   * @private
   */
  _handleRecordingStop() {
    if (this.recordedChunks.length === 0) {
      logger.warn('没有录制到任何数据');
      this.emit('recording-stopped', { duration: 0, blob: null });
      return;
    }

    const duration = this.startTime ? Date.now() - this.startTime : 0;
    const mimeType = this.mediaRecorder.mimeType;
    const blob = new Blob(this.recordedChunks, { type: mimeType });

    logger.info(`录制完成: ${(blob.size / 1024 / 1024).toFixed(2)} MB, 时长: ${(duration / 1000).toFixed(1)} 秒`);

    this.emit('recording-stopped', {
      blob,
      duration,
      size: blob.size,
      mimeType,
      url: URL.createObjectURL(blob)
    });
  }

  /**
   * 下载录制文件
   * @param {string} filename - 文件名（不含扩展名）
   */
  downloadRecording(filename = `会议录制_${this._getFormattedDate()}`) {
    if (this.recordedChunks.length === 0) {
      logger.warn('没有可下载的录制数据');
      return false;
    }

    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    // 根据 MIME 类型确定文件扩展名
    const extension = this._getExtension(mimeType);
    const fullFilename = `${filename}.${extension}`;

    // 创建下载链接
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    logger.info(`下载录制文件: ${fullFilename}`);
    this.emit('recording-downloaded', { filename: fullFilename, size: blob.size });
    return true;
  }

  /**
   * 获取支持的 MIME 类型
   * @private
   */
  _getSupportedMimeType() {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    logger.warn('没有找到首选的 MIME 类型，使用默认');
    return 'video/webm';
  }

  /**
   * 根据 MIME 类型获取文件扩展名
   * @private
   */
  _getExtension(mimeType) {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm'; // 默认
  }

  /**
   * 获取格式化的日期时间字符串
   * @private
   */
  _getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  /**
   * 获取录制状态
   */
  getState() {
    return {
      isRecording: this.isRecording,
      state: this.mediaRecorder?.state || 'inactive',
      duration: this.startTime ? Date.now() - this.startTime : 0,
      size: this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    if (this.isRecording) {
      this.stopRecording();
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingStream = null;
    this.removeAllListeners();
    logger.info('RecordManager 已清理');
  }
}

