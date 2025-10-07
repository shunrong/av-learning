/**
 * 应用入口
 * 组装所有模块，处理业务逻辑
 */

import { RoomClient } from './modules/RoomClient.js';
import { UIController } from './modules/UIController.js';
import { logger } from './utils/logger.js';

class ConferenceApp {
  constructor() {
    this.roomClient = null;
    this.ui = new UIController();
    this.remoteStreams = new Map(); // Map<userId, MediaStream>
  }

  /**
   * 初始化应用
   */
  init() {
    logger.info('初始化应用...');
    
    // 初始化UI
    this.ui.init();
    this.ui.showLogin();
    
    // 绑定UI事件
    this._bindUIEvents();
    
    logger.info('应用初始化完成');
  }

  /**
   * 绑定UI事件
   */
  _bindUIEvents() {
    // 加入房间
    this.ui.elements.joinBtn.onclick = () => this._handleJoinRoom();
    
    // 离开房间
    this.ui.elements.leaveBtn.onclick = () => this._handleLeaveRoom();
    
    // 切换音频
    this.ui.elements.toggleAudioBtn.onclick = () => this._handleToggleAudio();
    
    // 切换视频
    this.ui.elements.toggleVideoBtn.onclick = () => this._handleToggleVideo();
    
    // 回车键加入房间
    this.ui.elements.userNameInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        this._handleJoinRoom();
      }
    };
  }

  /**
   * 处理加入房间
   */
  async _handleJoinRoom() {
    const roomId = this.ui.elements.roomIdInput.value.trim();
    const userName = this.ui.elements.userNameInput.value.trim();
    
    if (!roomId || !userName) {
      this.ui.showError('请输入房间号和用户名');
      return;
    }

    try {
      this.ui.elements.joinBtn.disabled = true;
      this.ui.updateConnectionStatus('正在连接...', 'orange');
      
      // 创建房间客户端
      const signalingUrl = `ws://${window.location.hostname}:3000`;
      this.roomClient = new RoomClient(signalingUrl);
      
      // 绑定房间事件
      this._bindRoomEvents();
      
      // 加入房间
      await this.roomClient.joinRoom(roomId, userName);
      
      logger.info('加入房间请求已发送');
    } catch (error) {
      logger.error('加入房间失败:', error);
      this.ui.showError('加入房间失败: ' + error.message);
      this.ui.elements.joinBtn.disabled = false;
      this.ui.updateConnectionStatus('连接失败', 'red');
    }
  }

  /**
   * 绑定房间事件
   */
  _bindRoomEvents() {
    // 成功加入房间
    this.roomClient.on('room-joined', (data) => {
      logger.info('已加入房间:', data);
      this.ui.showConference();
      this.ui.updateRoomInfo(data.roomId, data.userName);
      this.ui.updateConnectionStatus('已连接', 'green');
      this.ui.updateUserList(this.roomClient.getRoomUsers());
    });

    // 本地视频流
    this.roomClient.on('local-stream', (stream) => {
      logger.info('收到本地流');
      this.ui.setLocalStream(stream);
    });

    // 新用户加入
    this.roomClient.on('user-joined', (data) => {
      logger.info('新用户加入:', data);
      this.ui.updateUserList(this.roomClient.getRoomUsers());
      this.ui.showMessage(`${data.userName} 加入了房间`);
    });

    // 用户离开
    this.roomClient.on('user-left', (data) => {
      logger.info('用户离开:', data);
      this.ui.removeRemoteVideo(data.userId);
      this.ui.updateUserList(this.roomClient.getRoomUsers());
      this.ui.showMessage(`${data.userName} 离开了房间`);
      this.remoteStreams.delete(data.userId);
    });

    // 收到远程轨道
    this.roomClient.on('remote-track', (data) => {
      logger.info('收到远程轨道:', data.userId, data.track.kind);
      this._handleRemoteTrack(data);
    });

    // 连接状态变化
    this.roomClient.on('connection-state-change', (data) => {
      logger.info('连接状态:', data.userId, data.state);
      if (data.state === 'connected') {
        this.ui.showMessage(`与 ${data.userId} 连接成功`);
      } else if (data.state === 'disconnected' || data.state === 'failed') {
        this.ui.showMessage(`与 ${data.userId} 连接断开`);
      }
    });

    // 音视频切换
    this.roomClient.on('audio-toggled', (enabled) => {
      this.ui.updateAudioButton(enabled);
    });

    this.roomClient.on('video-toggled', (enabled) => {
      this.ui.updateVideoButton(enabled);
    });
  }

  /**
   * 处理远程轨道
   */
  _handleRemoteTrack(data) {
    const { userId, track, streams } = data;
    
    // 获取或创建远程流
    let stream = this.remoteStreams.get(userId);
    if (!stream) {
      stream = streams[0] || new MediaStream();
      this.remoteStreams.set(userId, stream);
      
      // 查找用户名
      const user = this.roomClient.users.get(userId);
      const userName = user?.userName || userId;
      
      // 添加远程视频
      this.ui.addRemoteVideo(userId, stream, userName);
    }
    
    // 添加轨道到流（如果还没有）
    if (!stream.getTracks().find(t => t.id === track.id)) {
      stream.addTrack(track);
      logger.debug(`添加 ${track.kind} track 到 ${userId} 的流`);
    }
  }

  /**
   * 处理离开房间
   */
  _handleLeaveRoom() {
    if (!this.roomClient) return;
    
    logger.info('离开房间');
    this.roomClient.leaveRoom();
    this.roomClient.dispose();
    this.roomClient = null;
    
    // 清理UI
    this.ui.clearRemoteVideos();
    this.ui.clearLocalVideo();
    this.ui.showLogin();
    this.ui.elements.joinBtn.disabled = false;
    this.ui.updateConnectionStatus('未连接', 'gray');
    
    this.remoteStreams.clear();
  }

  /**
   * 处理音频切换
   */
  _handleToggleAudio() {
    if (!this.roomClient) return;
    this.roomClient.toggleAudio();
  }

  /**
   * 处理视频切换
   */
  _handleToggleVideo() {
    if (!this.roomClient) return;
    this.roomClient.toggleVideo();
  }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
  const app = new ConferenceApp();
  app.init();
  
  // 全局暴露（便于调试）
  window.app = app;
  
  // 页面关闭时清理
  window.addEventListener('beforeunload', () => {
    if (app.roomClient) {
      app.roomClient.dispose();
    }
  });
});

