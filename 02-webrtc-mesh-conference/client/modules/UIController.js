/**
 * UI控制器
 * 负责UI渲染和用户交互
 */

import { logger } from '../utils/logger.js';

export class UIController {
  constructor() {
    this.elements = {};
    this.remoteVideos = new Map(); // Map<userId, videoElement>
  }

  /**
   * 初始化UI元素引用
   */
  init() {
    this.elements = {
      // 登录区域
      loginSection: document.getElementById('login-section'),
      roomIdInput: document.getElementById('room-id'),
      userNameInput: document.getElementById('user-name'),
      joinBtn: document.getElementById('join-btn'),
      
      // 会议区域
      conferenceSection: document.getElementById('conference-section'),
      localVideo: document.getElementById('local-video'),
      videoArea: document.getElementById('video-area'),
      
      // 控制按钮
      toggleAudioBtn: document.getElementById('toggle-audio'),
      toggleVideoBtn: document.getElementById('toggle-video'),
      leaveBtn: document.getElementById('leave-btn'),
      
      // 信息显示
      roomInfo: document.getElementById('room-info'),
      userList: document.getElementById('user-list'),
      connectionStatus: document.getElementById('connection-status')
    };

    logger.debug('UI元素初始化完成');
  }

  /**
   * 显示登录界面
   */
  showLogin() {
    this.elements.loginSection.style.display = 'flex';
    this.elements.conferenceSection.style.display = 'none';
  }

  /**
   * 显示会议界面
   */
  showConference() {
    this.elements.loginSection.style.display = 'none';
    this.elements.conferenceSection.style.display = 'flex';
  }

  /**
   * 设置本地视频流
   */
  setLocalStream(stream) {
    if (this.elements.localVideo) {
      this.elements.localVideo.srcObject = stream;
      this.elements.localVideo.muted = true; // 本地视频静音
      logger.info('本地视频流已设置');
    }
  }

  /**
   * 添加远程视频
   */
  addRemoteVideo(userId, stream, userName) {
    if (this.remoteVideos.has(userId)) {
      logger.warn(`远程视频已存在: ${userId}`);
      return;
    }

    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.id = `video-${userId}`;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;

    const nameLabel = document.createElement('div');
    nameLabel.className = 'video-label';
    nameLabel.textContent = userName || userId;

    videoContainer.appendChild(video);
    videoContainer.appendChild(nameLabel);
    this.elements.videoArea.appendChild(videoContainer);

    this.remoteVideos.set(userId, { video, container: videoContainer });
    this._updateLayout();
    
    logger.info(`添加远程视频: ${userId}`);
  }

  /**
   * 移除远程视频
   */
  removeRemoteVideo(userId) {
    const videoData = this.remoteVideos.get(userId);
    if (videoData) {
      videoData.container.remove();
      this.remoteVideos.delete(userId);
      this._updateLayout();
      logger.info(`移除远程视频: ${userId}`);
    }
  }

  /**
   * 更新视频布局 - 根据参与人数动态调整网格
   */
  _updateLayout() {
    const count = this.remoteVideos.size;
    const container = this.elements.videoArea;
    
    // 移除所有布局类
    container.className = 'video-area';
    
    // 根据参与人数添加对应的布局类
    if (count === 0) {
      container.classList.add('participants-1'); // 只有自己
    } else if (count === 1) {
      container.classList.add('participants-1'); // 1个远程用户
    } else if (count === 2) {
      container.classList.add('participants-2');
    } else if (count === 3 || count === 4) {
      container.classList.add('participants-4');
    } else if (count === 5 || count === 6) {
      container.classList.add('participants-6');
    } else {
      container.classList.add('participants-more');
    }
    
    logger.debug(`布局更新: ${count} 个远程参与者`);
  }

  /**
   * 更新房间信息
   */
  updateRoomInfo(roomId, userName) {
    if (this.elements.roomInfo) {
      this.elements.roomInfo.textContent = `房间: ${roomId} | 用户: ${userName}`;
    }
  }

  /**
   * 更新用户列表
   */
  updateUserList(users) {
    if (!this.elements.userList) return;
    
    this.elements.userList.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user.userName || user.userId;
      this.elements.userList.appendChild(li);
    });
  }

  /**
   * 更新连接状态
   */
  updateConnectionStatus(status, color = 'green') {
    if (this.elements.connectionStatus) {
      this.elements.connectionStatus.textContent = status;
      this.elements.connectionStatus.style.color = color;
    }
  }

  /**
   * 更新音频按钮状态
   */
  updateAudioButton(enabled) {
    if (this.elements.toggleAudioBtn) {
      this.elements.toggleAudioBtn.textContent = enabled ? '🎤 静音' : '🔇 取消静音';
      this.elements.toggleAudioBtn.classList.toggle('disabled', !enabled);
    }
  }

  /**
   * 更新视频按钮状态
   */
  updateVideoButton(enabled) {
    if (this.elements.toggleVideoBtn) {
      this.elements.toggleVideoBtn.textContent = enabled ? '📹 关闭视频' : '📷 开启视频';
      this.elements.toggleVideoBtn.classList.toggle('disabled', !enabled);
    }
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    alert(`错误: ${message}`);
    logger.error(message);
  }

  /**
   * 显示提示消息
   */
  showMessage(message) {
    // 可以改为更优雅的提示方式
    console.log('提示:', message);
  }

  /**
   * 清理所有远程视频
   */
  clearRemoteVideos() {
    this.remoteVideos.forEach((data, userId) => {
      this.removeRemoteVideo(userId);
    });
  }

  /**
   * 清理本地视频
   */
  clearLocalVideo() {
    if (this.elements.localVideo) {
      this.elements.localVideo.srcObject = null;
    }
  }
}

