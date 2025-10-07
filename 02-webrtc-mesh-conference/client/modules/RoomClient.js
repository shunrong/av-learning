/**
 * 房间客户端
 * 协调所有模块，管理房间状态和用户连接
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';
import { SignalingClient } from './SignalingClient.js';
import { MediaManager } from './MediaManager.js';
import { PeerConnectionManager } from './PeerConnectionManager.js';
import { ChatManager } from './ChatManager.js';

export class RoomClient extends EventEmitter {
  constructor(signalingUrl) {
    super();
    
    // 初始化各个模块
    this.signaling = new SignalingClient(signalingUrl);
    this.mediaManager = new MediaManager();
    this.pcManager = new PeerConnectionManager();
    this.chatManager = new ChatManager();
    
    // 将 ChatManager 注入到 PCManager
    this.pcManager.setChatManager(this.chatManager);
    
    // 房间状态
    this.roomId = null;
    this.userId = null;
    this.userName = null;
    this.users = new Map(); // Map<userId, {userName, stream}>
    
    // 绑定事件
    this._bindEvents();
  }

  /**
   * 绑定各模块的事件
   */
  _bindEvents() {
    // === 信令事件 ===
    this.signaling.on('connected', () => {
      logger.info('信令连接成功');
      this.emit('signaling-connected');
    });

    this.signaling.on('room-joined', (data) => {
      logger.info('成功加入房间:', data);
      this.roomId = data.roomId;
      this.userId = data.userId;
      this.users = new Map(data.users.map(u => [u.userId, u]));
      this.emit('room-joined', data);
      
      // 与房间内已有用户建立连接
      this._connectToExistingUsers(data.users);
    });

    this.signaling.on('user-joined', async (data) => {
      logger.info('新用户加入:', data);
      this.users.set(data.userId, data);
      this.emit('user-joined', data);
      
      // 发送系统消息
      this.chatManager.sendSystemMessage(`${data.userName} 加入了会议`, 'user-join');
      
      // 主动向新用户发起连接
      await this._initiateConnectionTo(data.userId);
    });

    this.signaling.on('user-left', (data) => {
      logger.info('用户离开:', data);
      this.users.delete(data.userId);
      this.pcManager.closePeerConnection(data.userId);
      
      // 发送系统消息
      this.chatManager.sendSystemMessage(`${data.userName} 离开了会议`, 'user-leave');
      
      this.emit('user-left', data);
    });

    this.signaling.on('offer', async (data) => {
      logger.info('收到 Offer from', data.userId);
      await this._handleOffer(data);
    });

    this.signaling.on('answer', async (data) => {
      logger.info('收到 Answer from', data.userId);
      await this._handleAnswer(data);
    });

    this.signaling.on('ice-candidate', async (data) => {
      logger.debug('收到 ICE candidate from', data.userId);
      await this.pcManager.addIceCandidate(data.userId, data.candidate);
    });

    // === PeerConnection 事件 ===
    this.pcManager.on('ice-candidate', (data) => {
      this.signaling.sendIceCandidate(data.userId, data.candidate);
    });

    this.pcManager.on('remote-track', (data) => {
      logger.info('收到远程轨道 from', data.userId, data.track.kind);
      this.emit('remote-track', data);
    });

    this.pcManager.on('connection-state-change', (data) => {
      logger.info('连接状态变化:', data.userId, data.state);
      this.emit('connection-state-change', data);
    });

    // === 媒体管理事件 ===
    this.mediaManager.on('local-stream', (stream) => {
      this.emit('local-stream', stream);
    });

    this.mediaManager.on('audio-toggled', (enabled) => {
      this.emit('audio-toggled', enabled);
    });

    this.mediaManager.on('video-toggled', (enabled) => {
      this.emit('video-toggled', enabled);
    });

    // === 聊天管理事件 ===
    this.chatManager.on('channel-open', (data) => {
      logger.info('[RoomClient] DataChannel 打开:', data.userName);
      this.emit('chat-channel-open', data);
    });

    this.chatManager.on('message', (message) => {
      logger.debug('[RoomClient] 收到聊天消息:', message);
      this.emit('chat-message', message);
    });

    this.chatManager.on('channel-close', (data) => {
      logger.info('[RoomClient] DataChannel 关闭:', data.userName);
      this.emit('chat-channel-close', data);
    });

    this.chatManager.on('error', (data) => {
      logger.error('[RoomClient] ChatManager 错误:', data);
      this.emit('chat-error', data);
    });
  }

  /**
   * 连接到信令服务器并加入房间
   */
  async joinRoom(roomId, userName) {
    try {
      this.userName = userName;
      
      // 1. 连接信令服务器
      await this.signaling.connect();
      
      // 2. 获取本地媒体
      await this.mediaManager.getLocalMedia();
      
      // 3. 加入房间
      this.signaling.joinRoom(roomId, userName);
      
      logger.info(`正在加入房间 ${roomId}...`);
    } catch (error) {
      logger.error('加入房间失败:', error);
      throw error;
    }
  }

  /**
   * 与房间内已有用户建立连接
   */
  async _connectToExistingUsers(users) {
    // 过滤掉自己
    const otherUsers = users.filter(u => u.userId !== this.userId);
    
    if (otherUsers.length === 0) {
      logger.info('房间内暂无其他用户');
      return;
    }

    logger.info(`房间内有 ${otherUsers.length} 个用户，开始建立连接...`);
    
    // 注意：我们不主动发起 offer，等待房间内的用户向我们发送 offer
    // 这样可以避免双方同时发送 offer 导致的冲突
  }

  /**
   * 向指定用户发起连接（发送 Offer）
   */
  async _initiateConnectionTo(userId) {
    try {
      const user = this.users.get(userId);
      const userName = user ? user.userName : userId;
      
      logger.info(`向用户 ${userName}(${userId}) 发起连接`);
      
      // 1. 创建 PeerConnection（发起方创建 DataChannel）
      const pc = this.pcManager.createPeerConnection(
        userId,
        this.mediaManager.localStream,
        { createDataChannel: true, userName }
      );
      
      // 2. 创建并发送 Offer
      const offer = await this.pcManager.createOffer(userId);
      this.signaling.sendOffer(userId, offer);
      
      logger.info(`Offer 已发送给 ${userName}(${userId})`);
    } catch (error) {
      logger.error(`向 ${userId} 发起连接失败:`, error);
      throw error;
    }
  }

  /**
   * 处理收到的 Offer
   */
  async _handleOffer(data) {
    const { userId, offer } = data;
    
    try {
      const user = this.users.get(userId);
      const userName = user ? user.userName : userId;
      
      // 1. 创建 PeerConnection（如果还不存在）
      let pc = this.pcManager.peerConnections.get(userId);
      if (!pc) {
        // 接收方不创建 DataChannel，等待对方创建
        pc = this.pcManager.createPeerConnection(
          userId,
          this.mediaManager.localStream,
          { createDataChannel: false, userName }
        );
      }
      
      // 2. 设置远程描述
      await this.pcManager.setRemoteDescription(userId, offer);
      
      // 3. 创建并发送 Answer
      const answer = await this.pcManager.createAnswer(userId);
      this.signaling.sendAnswer(userId, answer);
      
      logger.info(`Answer 已发送给 ${userName}(${userId})`);
    } catch (error) {
      logger.error(`处理 Offer 失败 from ${userId}:`, error);
    }
  }

  /**
   * 处理收到的 Answer
   */
  async _handleAnswer(data) {
    const { userId, answer } = data;
    
    try {
      await this.pcManager.setRemoteDescription(userId, answer);
      logger.info(`已设置 Answer from ${userId}`);
    } catch (error) {
      logger.error(`处理 Answer 失败 from ${userId}:`, error);
    }
  }

  /**
   * 离开房间
   */
  leaveRoom() {
    logger.info('离开房间');
    
    // 1. 通知服务器
    this.signaling.leaveRoom();
    
    // 2. 关闭所有连接
    this.pcManager.closeAllConnections();
    
    // 3. 停止本地媒体
    this.mediaManager.stopLocalMedia();
    
    // 4. 清空状态
    this.roomId = null;
    this.userId = null;
    this.users.clear();
    
    this.emit('left-room');
  }

  /**
   * 切换音频
   */
  toggleAudio() {
    return this.mediaManager.toggleAudio();
  }

  /**
   * 切换视频
   */
  toggleVideo() {
    return this.mediaManager.toggleVideo();
  }

  /**
   * 发送聊天消息
   * @param {string} text - 消息内容
   */
  sendChatMessage(text) {
    if (!this.userName) {
      logger.warn('[RoomClient] 未加入房间，无法发送消息');
      return;
    }
    this.chatManager.sendMessage(text, this.userName);
  }

  /**
   * 获取聊天消息历史
   * @returns {Array} 消息列表
   */
  getChatMessages() {
    return this.chatManager.getMessages();
  }

  /**
   * 获取聊天连接状态
   * @returns {Object} 状态信息
   */
  getChatStatus() {
    return this.chatManager.getStatus();
  }

  /**
   * 获取房间内的用户列表
   */
  getRoomUsers() {
    return Array.from(this.users.values());
  }

  /**
   * 获取连接数量
   */
  getConnectionCount() {
    return this.pcManager.getConnectionCount();
  }

  /**
   * 清理所有资源
   */
  dispose() {
    this.leaveRoom();
    this.signaling.disconnect();
    this.pcManager.dispose();
    this.mediaManager.dispose();
    this.chatManager.dispose();
    this.removeAllListeners();
    logger.info('RoomClient 已清理');
  }
}

