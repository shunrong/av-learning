/**
 * 美颜滤镜管理器
 * 使用 Canvas 处理视频流，添加美颜效果
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';

export class BeautyFilterManager extends EventEmitter {
  constructor() {
    super();
    
    // Canvas 相关
    this.canvas = null;
    this.ctx = null;
    this.sourceVideo = null;
    this.filteredStream = null;
    
    // 美颜参数
    this.isEnabled = false;
    this.settings = {
      smoothing: 5,      // 磨皮强度 (0-10)
      brightness: 15,    // 美白强度 (0-30)
      saturation: 5      // 红润强度 (0-20)
    };
    
    // 动画帧
    this.animationFrameId = null;
    
    logger.info('BeautyFilterManager 初始化');
  }

  /**
   * 初始化美颜处理
   * @param {MediaStream} stream - 原始视频流
   * @param {HTMLVideoElement} videoElement - 视频元素（可选）
   */
  async initialize(stream, videoElement = null) {
    try {
      // 创建视频元素
      this.sourceVideo = videoElement || document.createElement('video');
      this.sourceVideo.srcObject = stream;
      this.sourceVideo.autoplay = true;
      this.sourceVideo.muted = true;
      this.sourceVideo.playsInline = true;

      // 等待视频加载并播放
      await new Promise((resolve, reject) => {
        this.sourceVideo.onloadedmetadata = async () => {
          try {
            // 确保视频开始播放
            await this.sourceVideo.play();
            
            const width = this.sourceVideo.videoWidth;
            const height = this.sourceVideo.videoHeight;

            if (width === 0 || height === 0) {
              throw new Error('视频尺寸无效');
            }

            logger.info(`视频尺寸: ${width}x${height}`);

            // 创建 Canvas
            this.canvas = document.createElement('canvas');
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

            // 先绘制一帧到 Canvas（避免黑屏）
            this.ctx.drawImage(this.sourceVideo, 0, 0, width, height);

            // 从 Canvas 创建媒体流
            this.filteredStream = this.canvas.captureStream(30); // 30 FPS

            // 添加原始音频轨道到滤镜流
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach(track => {
              this.filteredStream.addTrack(track);
            });

            // 启动基础绘制（始终保持 Canvas 有内容）
            this._startBasicDrawing();

            logger.info('✅ 美颜滤镜初始化成功');
            resolve(this.filteredStream);
          } catch (err) {
            reject(err);
          }
        };

        this.sourceVideo.onerror = (error) => {
          logger.error('视频加载失败:', error);
          reject(error);
        };

        // 超时处理
        setTimeout(() => {
          reject(new Error('视频加载超时'));
        }, 5000);
      });

      return this.filteredStream;
    } catch (error) {
      logger.error('初始化美颜滤镜失败:', error);
      throw error;
    }
  }

  /**
   * 启用美颜
   */
  enable() {
    if (this.isEnabled) {
      logger.warn('美颜已启用');
      return;
    }

    if (!this.canvas || !this.sourceVideo) {
      logger.error('美颜滤镜未初始化');
      throw new Error('美颜滤镜未初始化');
    }

    this.isEnabled = true;
    // _startProcessing 会接管绘制循环，应用美颜效果
    this._startProcessing();
    logger.info('✅ 美颜已启用');
    this.emit('enabled');
  }

  /**
   * 禁用美颜
   */
  disable() {
    if (!this.isEnabled) {
      logger.warn('美颜已禁用');
      return;
    }

    this.isEnabled = false;
    this._stopProcessing();
    // 恢复基础绘制（显示原始视频）
    this._startBasicDrawing();
    logger.info('美颜已禁用');
    this.emit('disabled');
  }

  /**
   * 切换美颜状态
   */
  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.isEnabled;
  }

  /**
   * 更新美颜参数
   * @param {Object} settings - 美颜设置
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    logger.debug('美颜参数已更新:', this.settings);
    this.emit('settings-updated', this.settings);
  }

  /**
   * 获取滤镜后的视频轨道
   */
  getFilteredVideoTrack() {
    return this.filteredStream?.getVideoTracks()[0] || null;
  }

  /**
   * 获取滤镜后的流
   */
  getFilteredStream() {
    return this.filteredStream;
  }

  /**
   * 启动基础绘制（无美颜）
   * @private
   */
  _startBasicDrawing() {
    const drawFrame = () => {
      // 如果美颜已启用，停止基础绘制
      if (this.isEnabled) {
        return;
      }

      if (!this.sourceVideo || !this.canvas) {
        return;
      }

      try {
        // 只绘制原始视频，不应用美颜
        this.ctx.drawImage(
          this.sourceVideo,
          0, 0,
          this.canvas.width,
          this.canvas.height
        );

        // 继续下一帧
        this.animationFrameId = requestAnimationFrame(drawFrame);
      } catch (error) {
        logger.error('绘制视频帧失败:', error);
      }
    };

    drawFrame();
    logger.debug('启动基础绘制');
  }

  /**
   * 开始处理视频帧（美颜）
   * @private
   */
  _startProcessing() {
    // 取消基础绘制的 RAF
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const processFrame = () => {
      if (!this.isEnabled || !this.sourceVideo || !this.canvas) {
        // 如果美颜被禁用，恢复基础绘制
        if (!this.isEnabled && this.canvas && this.sourceVideo) {
          this._startBasicDrawing();
        }
        return;
      }

      try {
        // 绘制原始视频帧到 Canvas
        this.ctx.drawImage(
          this.sourceVideo,
          0, 0,
          this.canvas.width,
          this.canvas.height
        );

        // 应用美颜滤镜
        this._applyBeautyFilter();

        // 继续下一帧
        this.animationFrameId = requestAnimationFrame(processFrame);
      } catch (error) {
        logger.error('处理视频帧失败:', error);
      }
    };

    processFrame();
    logger.debug('开始美颜处理');
  }

  /**
   * 停止处理视频帧
   * @private
   */
  _stopProcessing() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      logger.debug('停止处理视频帧');
    }
  }

  /**
   * 应用美颜滤镜
   * @private
   */
  _applyBeautyFilter() {
    const { smoothing, brightness, saturation } = this.settings;

    // 获取图像数据
    const imageData = this.ctx.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    const data = imageData.data;

    // 应用美白和红润
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 美白：增加亮度
      if (brightness > 0) {
        data[i] = Math.min(255, r + brightness);
        data[i + 1] = Math.min(255, g + brightness);
        data[i + 2] = Math.min(255, b + brightness);
      }

      // 红润：增加饱和度（略微增加红色通道）
      if (saturation > 0) {
        data[i] = Math.min(255, data[i] + saturation * 0.3);
      }
    }

    // 磨皮：高斯模糊
    if (smoothing > 0) {
      this._applyGaussianBlur(imageData, smoothing);
    }

    // 放回处理后的图像
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 应用简化的高斯模糊（磨皮效果）
   * @private
   */
  _applyGaussianBlur(imageData, radius) {
    if (radius < 1) return;

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);

    // 简化版：只对肤色区域进行模糊
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4;

        // 检测是否为肤色（简单的肤色检测）
        if (!this._isSkinTone(data[idx], data[idx + 1], data[idx + 2])) {
          continue;
        }

        let r = 0, g = 0, b = 0, count = 0;

        // 周围像素平均
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4;
              r += tempData[nIdx];
              g += tempData[nIdx + 1];
              b += tempData[nIdx + 2];
              count++;
            }
          }
        }

        // 混合原始颜色和模糊颜色（保留细节）
        const blurStrength = 0.7; // 模糊强度
        data[idx] = data[idx] * (1 - blurStrength) + (r / count) * blurStrength;
        data[idx + 1] = data[idx + 1] * (1 - blurStrength) + (g / count) * blurStrength;
        data[idx + 2] = data[idx + 2] * (1 - blurStrength) + (b / count) * blurStrength;
      }
    }
  }

  /**
   * 简单的肤色检测
   * @private
   */
  _isSkinTone(r, g, b) {
    // 简化的肤色检测算法
    return (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15
    );
  }

  /**
   * 清理资源
   */
  dispose() {
    this.disable();

    if (this.sourceVideo) {
      this.sourceVideo.srcObject = null;
      this.sourceVideo = null;
    }

    if (this.filteredStream) {
      this.filteredStream.getTracks().forEach(track => track.stop());
      this.filteredStream = null;
    }

    this.canvas = null;
    this.ctx = null;

    this.removeAllListeners();
    logger.info('BeautyFilterManager 已清理');
  }
}

