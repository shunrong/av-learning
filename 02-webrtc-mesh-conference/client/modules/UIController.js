/**
 * UI控制器
 * 负责UI渲染和用户交互
 */

import { logger } from '../utils/logger.js';

export class UIController {
  constructor() {
    this.elements = {};
    this.remoteVideos = new Map(); // Map<userId, videoElement>
    this.currentTab = 'users'; // 当前激活的 Tab
    this.unreadCount = 0; // 未读消息数
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
      toggleBeautyBtn: document.getElementById('toggle-beauty'),
      toggleScreenBtn: document.getElementById('toggle-screen'),
      toggleRecordBtn: document.getElementById('toggle-record'),
      leaveBtn: document.getElementById('leave-btn'),
      
      // 信息显示
      roomInfo: document.getElementById('room-info'),
      userList: document.getElementById('user-list'),
      connectionStatus: document.getElementById('connection-status'),
      
      // Tab 切换
      tabUsers: document.getElementById('tab-users'),
      tabChat: document.getElementById('tab-chat'),
      usersPanel: document.getElementById('users-panel'),
      chatPanel: document.getElementById('chat-panel'),
      chatBadge: document.getElementById('chat-badge'),
      
      // 聊天相关
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      sendMessageBtn: document.getElementById('send-message')
    };

    // 绑定 Tab 切换事件
    this._setupTabEvents();
    
    // 绑定聊天事件
    this._setupChatEvents();

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
   * 更新美颜按钮状态
   */
  updateBeautyButton(isEnabled) {
    if (this.elements.toggleBeautyBtn) {
      this.elements.toggleBeautyBtn.textContent = isEnabled ? '✨ 关闭美颜' : '✨ 美颜';
      this.elements.toggleBeautyBtn.classList.toggle('active', isEnabled);
    }
  }

  /**
   * 更新屏幕共享按钮状态
   */
  updateScreenShareButton(isSharing) {
    if (this.elements.toggleScreenBtn) {
      this.elements.toggleScreenBtn.textContent = isSharing ? '🖥️ 停止共享' : '🖥️ 共享屏幕';
      this.elements.toggleScreenBtn.classList.toggle('active', isSharing);
    }
  }

  /**
   * 更新录制按钮状态
   */
  updateRecordButton(isRecording) {
    if (this.elements.toggleRecordBtn) {
      this.elements.toggleRecordBtn.textContent = isRecording ? '⏹️ 停止录制' : '⏺️ 开始录制';
      this.elements.toggleRecordBtn.classList.toggle('recording', isRecording);
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

  // ========== Tab 切换相关方法 ==========

  /**
   * 设置 Tab 切换事件
   * @private
   */
  _setupTabEvents() {
    // 参会人员 Tab
    if (this.elements.tabUsers) {
      this.elements.tabUsers.onclick = () => this.switchTab('users');
    }

    // 聊天 Tab
    if (this.elements.tabChat) {
      this.elements.tabChat.onclick = () => this.switchTab('chat');
    }
  }

  /**
   * 切换 Tab
   * @param {string} tab - Tab 名称 ('users' 或 'chat')
   */
  switchTab(tab) {
    if (this.currentTab === tab) return;

    this.currentTab = tab;

    // 更新 Tab 按钮状态
    this.elements.tabUsers.classList.toggle('active', tab === 'users');
    this.elements.tabChat.classList.toggle('active', tab === 'chat');

    // 更新 Tab 面板显示
    this.elements.usersPanel.classList.toggle('active', tab === 'users');
    this.elements.chatPanel.classList.toggle('active', tab === 'chat');

    // 切换到聊天时清除未读消息
    if (tab === 'chat') {
      this.clearUnreadBadge();
      this._scrollChatToBottom();
    }

    logger.debug(`切换到 ${tab} 标签`);
  }

  /**
   * 更新未读消息徽章
   * @param {number} count - 未读消息数
   */
  updateUnreadBadge(count) {
    this.unreadCount = count;

    if (count > 0) {
      this.elements.chatBadge.textContent = count > 99 ? '99+' : count;
      this.elements.chatBadge.style.display = 'inline-block';
    } else {
      this.elements.chatBadge.style.display = 'none';
    }
  }

  /**
   * 清除未读消息徽章
   */
  clearUnreadBadge() {
    this.updateUnreadBadge(0);
  }

  // ========== 聊天相关方法 ==========

  /**
   * 设置聊天事件监听
   * @private
   */
  _setupChatEvents() {
    // 回车发送消息
    if (this.elements.chatInput) {
      this.elements.chatInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.onSendMessage && this.onSendMessage();
        }
      };
    }
  }

  /**
   * 添加聊天消息
   * @param {Object} message - 消息对象
   */
  addChatMessage(message) {
    const { userId, userName, text, timestamp, type, isRemote } = message;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type === 'system' ? 'system' : (isRemote ? 'remote' : 'self')}`;

    if (type === 'system') {
      // 系统消息
      messageDiv.innerHTML = `
        <div class="message-content">${text}</div>
      `;
    } else {
      // 用户消息
      const time = new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      messageDiv.innerHTML = `
        <div class="message-header">
          <span class="message-sender">${userName}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${this._escapeHtml(text)}</div>
      `;
    }

    this.elements.chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    this._scrollChatToBottom();
    
    // 如果当前不在聊天 Tab 且是远程消息，增加未读消息数
    if (this.currentTab !== 'chat' && (isRemote || type === 'system')) {
      this.updateUnreadBadge(this.unreadCount + 1);
    }
  }

  /**
   * 获取聊天输入内容
   */
  getChatInput() {
    return this.elements.chatInput.value.trim();
  }

  /**
   * 清空聊天输入框
   */
  clearChatInput() {
    this.elements.chatInput.value = '';
  }

  /**
   * 清空聊天消息
   */
  clearChatMessages() {
    this.elements.chatMessages.innerHTML = '';
  }

  /**
   * 滚动聊天到底部
   * @private
   */
  _scrollChatToBottom() {
    const container = this.elements.chatMessages;
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }

  /**
   * HTML 转义（防止 XSS）
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 清理方法 ==========

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

