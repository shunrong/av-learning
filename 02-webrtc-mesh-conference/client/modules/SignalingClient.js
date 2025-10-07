/**
 * 信令客户端
 * 负责与信令服务器的 WebSocket 通信
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';

export class SignalingClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  /**
   * 连接到信令服务器
   */
  connect() {
    return new Promise((resolve, reject) => {
      logger.info('正在连接信令服务器...', this.url);
      
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.info('✅ 信令服务器连接成功');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();
      };

      this.ws.onclose = () => {
        logger.warn('信令服务器连接已关闭');
        this.connected = false;
        this.emit('disconnected');
        this._attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('信令服务器连接错误:', error);
        this.emit('error', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          logger.debug('📨 收到信令消息:', message.type, message);
          this._handleMessage(message);
        } catch (error) {
          logger.error('信令消息解析失败:', error);
        }
      };
    });
  }

  /**
   * 处理收到的信令消息
   */
  _handleMessage(message) {
    const { type, ...data } = message;
    
    switch (type) {
      case 'room-joined':
        this.emit('room-joined', data);
        break;
      case 'user-joined':
        this.emit('user-joined', data);
        break;
      case 'user-left':
        this.emit('user-left', data);
        break;
      case 'offer':
        this.emit('offer', data);
        break;
      case 'answer':
        this.emit('answer', data);
        break;
      case 'ice-candidate':
        this.emit('ice-candidate', data);
        break;
      case 'error':
        this.emit('signaling-error', data);
        break;
      default:
        logger.warn('未知的信令消息类型:', type);
    }
  }

  /**
   * 发送信令消息
   */
  send(type, data) {
    if (!this.connected || !this.ws) {
      logger.error('无法发送消息：未连接到信令服务器');
      return false;
    }

    try {
      const message = { type, ...data };
      this.ws.send(JSON.stringify(message));
      logger.debug('📤 发送信令消息:', type, data);
      return true;
    } catch (error) {
      logger.error('发送信令消息失败:', error);
      return false;
    }
  }

  /**
   * 加入房间
   */
  joinRoom(roomId, userName) {
    return this.send('join-room', { roomId, userName });
  }

  /**
   * 离开房间
   */
  leaveRoom() {
    return this.send('leave-room', {});
  }

  /**
   * 发送 Offer
   */
  sendOffer(targetUserId, offer) {
    return this.send('offer', { targetUserId, offer });
  }

  /**
   * 发送 Answer
   */
  sendAnswer(targetUserId, answer) {
    return this.send('answer', { targetUserId, answer });
  }

  /**
   * 发送 ICE Candidate
   */
  sendIceCandidate(targetUserId, candidate) {
    return this.send('ice-candidate', { targetUserId, candidate });
  }

  /**
   * 尝试重连
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('已达到最大重连次数，停止重连');
      this.emit('reconnect-failed');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`${this.reconnectDelay / 1000}秒后尝试第${this.reconnectAttempts}次重连...`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // 重连失败会触发 onclose，继续下一次重连
      });
    }, this.reconnectDelay);
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.connected = false;
      this.ws.close();
      this.ws = null;
      logger.info('已断开信令服务器连接');
    }
  }
}

