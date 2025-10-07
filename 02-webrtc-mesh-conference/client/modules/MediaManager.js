/**
 * 媒体管理器
 * 负责本地媒体流的获取和管理
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';

export class MediaManager extends EventEmitter {
  constructor() {
    super();
    this.localStream = null;
    this.screenStream = null;
    this.audioEnabled = true;
    this.videoEnabled = true;
    this.isScreenSharing = false; // 是否正在共享屏幕
  }

  /**
   * 获取本地媒体流
   */
  async getLocalMedia(constraints = { video: true, audio: true }) {
    try {
      logger.info('正在获取本地媒体...');
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      logger.info('✅ 本地媒体获取成功');
      logger.debug('媒体轨道:', this.localStream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled
      })));
      
      this.emit('local-stream', this.localStream);
      return this.localStream;
    } catch (error) {
      logger.error('获取本地媒体失败:', error);
      this.emit('error', { type: 'get-media-failed', error });
      throw error;
    }
  }

  /**
   * 获取屏幕共享流
   */
  async getScreenShare() {
    try {
      logger.info('正在获取屏幕共享...');
      
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });
      
      // 监听屏幕共享停止
      this.screenStream.getVideoTracks()[0].onended = () => {
        logger.info('屏幕共享已停止');
        this.emit('screen-share-stopped');
      };
      
      logger.info('✅ 屏幕共享获取成功');
      this.emit('screen-stream', this.screenStream);
      return this.screenStream;
    } catch (error) {
      logger.error('获取屏幕共享失败:', error);
      this.emit('error', { type: 'get-screen-failed', error });
      throw error;
    }
  }

  /**
   * 切换音频状态
   */
  toggleAudio() {
    if (!this.localStream) {
      logger.warn('没有本地媒体流');
      return false;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      logger.warn('没有音频轨道');
      return false;
    }

    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });

    this.audioEnabled = audioTracks[0].enabled;
    logger.info(`音频${this.audioEnabled ? '开启' : '关闭'}`);
    this.emit('audio-toggled', this.audioEnabled);
    return this.audioEnabled;
  }

  /**
   * 切换视频状态
   */
  toggleVideo() {
    if (!this.localStream) {
      logger.warn('没有本地媒体流');
      return false;
    }

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      logger.warn('没有视频轨道');
      return false;
    }

    videoTracks.forEach(track => {
      track.enabled = !track.enabled;
    });

    this.videoEnabled = videoTracks[0].enabled;
    logger.info(`视频${this.videoEnabled ? '开启' : '关闭'}`);
    this.emit('video-toggled', this.videoEnabled);
    return this.videoEnabled;
  }

  /**
   * 停止本地媒体流
   */
  stopLocalMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        logger.debug(`停止 ${track.kind} track`);
      });
      this.localStream = null;
      logger.info('本地媒体流已停止');
    }
  }

  /**
   * 停止屏幕共享
   */
  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.stop();
      });
      this.screenStream = null;
      this.isScreenSharing = false;
      logger.info('屏幕共享已停止');
      this.emit('screen-share-stopped');
    }
  }

  /**
   * 切换到屏幕共享
   * @returns {Promise<MediaStreamTrack>} 屏幕视频轨道
   */
  async switchToScreenShare() {
    if (this.isScreenSharing) {
      logger.warn('已经在共享屏幕');
      return null;
    }

    try {
      await this.getScreenShare();
      this.isScreenSharing = true;
      
      const screenVideoTrack = this.screenStream.getVideoTracks()[0];
      
      // 监听用户点击浏览器的"停止共享"按钮
      screenVideoTrack.onended = () => {
        logger.info('用户停止了屏幕共享');
        this.switchToCamera().catch(err => {
          logger.error('切换回摄像头失败:', err);
        });
      };
      
      logger.info('✅ 切换到屏幕共享');
      this.emit('switched-to-screen', screenVideoTrack);
      return screenVideoTrack;
    } catch (error) {
      logger.error('切换到屏幕共享失败:', error);
      throw error;
    }
  }

  /**
   * 切换回摄像头
   * @returns {Promise<MediaStreamTrack>} 摄像头视频轨道
   */
  async switchToCamera() {
    if (!this.isScreenSharing) {
      logger.warn('当前不在共享屏幕');
      return null;
    }

    try {
      // 停止屏幕共享流
      this.stopScreenShare();
      this.isScreenSharing = false;
      
      // 获取摄像头视频轨道
      const cameraVideoTrack = this.localStream.getVideoTracks()[0];
      
      if (!cameraVideoTrack) {
        logger.error('没有找到摄像头视频轨道');
        throw new Error('没有摄像头视频轨道');
      }
      
      // 重新启用摄像头视频
      cameraVideoTrack.enabled = true;
      
      logger.info('✅ 切换回摄像头');
      this.emit('switched-to-camera', cameraVideoTrack);
      return cameraVideoTrack;
    } catch (error) {
      logger.error('切换回摄像头失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前视频轨道（屏幕共享或摄像头）
   * @returns {MediaStreamTrack|null}
   */
  getCurrentVideoTrack() {
    if (this.isScreenSharing && this.screenStream) {
      return this.screenStream.getVideoTracks()[0] || null;
    }
    return this.localStream?.getVideoTracks()[0] || null;
  }

  /**
   * 获取音频轨道
   */
  getAudioTrack() {
    return this.localStream?.getAudioTracks()[0] || null;
  }

  /**
   * 获取视频轨道
   */
  getVideoTrack() {
    return this.localStream?.getVideoTracks()[0] || null;
  }

  /**
   * 清理所有资源
   */
  dispose() {
    this.stopLocalMedia();
    this.stopScreenShare();
    this.removeAllListeners();
    logger.info('MediaManager 已清理');
  }
}

