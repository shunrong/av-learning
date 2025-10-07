/**
 * 聊天管理器
 * 基于 DataChannel 实现 P2P 文字聊天
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';

export class ChatManager extends EventEmitter {
  constructor() {
    super();
    
    // DataChannel 连接池
    this.channels = new Map(); // Map<userId, RTCDataChannel>
    
    // 聊天消息历史
    this.messages = []; // Array<{ userId, userName, text, timestamp, type }>
    
    logger.info('[ChatManager] 初始化');
  }

  /**
   * 为指定用户创建 DataChannel
   * @param {string} userId - 用户ID
   * @param {string} userName - 用户名
   * @param {RTCPeerConnection} pc - PeerConnection 实例
   * @param {boolean} isInitiator - 是否是发起方
   */
  createDataChannel(userId, userName, pc, isInitiator) {
    try {
      let channel;
      
      if (isInitiator) {
        // 主动创建 DataChannel
        channel = pc.createDataChannel('chat', {
          ordered: true, // 保证顺序
          maxRetransmits: 3 // 最多重传3次
        });
        
        logger.info(`[ChatManager] 创建 DataChannel for ${userName}(${userId})`);
      } else {
        // 被动接收 DataChannel
        pc.ondatachannel = (event) => {
          channel = event.channel;
          this._setupChannel(userId, userName, channel);
          logger.info(`[ChatManager] 接收 DataChannel from ${userName}(${userId})`);
        };
        return; // 等待 ondatachannel 事件
      }
      
      this._setupChannel(userId, userName, channel);
    } catch (error) {
      logger.error('[ChatManager] 创建 DataChannel 失败:', error);
      this.emit('error', { userId, error });
    }
  }

  /**
   * 设置 DataChannel 事件监听
   * @private
   */
  _setupChannel(userId, userName, channel) {
    // 打开事件
    channel.onopen = () => {
      logger.info(`[ChatManager] DataChannel 已打开: ${userName}(${userId})`);
      this.channels.set(userId, channel);
      this.emit('channel-open', { userId, userName });
    };

    // 消息接收
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._handleMessage(userId, userName, data);
      } catch (error) {
        logger.error('[ChatManager] 解析消息失败:', error);
      }
    };

    // 错误处理
    channel.onerror = (error) => {
      logger.error(`[ChatManager] DataChannel 错误 ${userName}:`, error);
      this.emit('error', { userId, userName, error });
    };

    // 关闭事件
    channel.onclose = () => {
      logger.info(`[ChatManager] DataChannel 已关闭: ${userName}(${userId})`);
      this.channels.delete(userId);
      this.emit('channel-close', { userId, userName });
    };
  }

  /**
   * 处理接收到的消息
   * @private
   */
  _handleMessage(userId, userName, data) {
    const message = {
      userId,
      userName,
      text: data.text,
      timestamp: data.timestamp || Date.now(),
      type: data.type || 'text',
      isRemote: true
    };

    logger.debug(`[ChatManager] 收到消息 from ${userName}:`, data.text);
    
    this.messages.push(message);
    this.emit('message', message);
  }

  /**
   * 发送文字消息
   * @param {string} text - 消息内容
   * @param {string} userName - 当前用户名
   */
  sendMessage(text, userName) {
    if (!text || !text.trim()) {
      logger.warn('[ChatManager] 消息内容为空');
      return;
    }

    const message = {
      text: text.trim(),
      timestamp: Date.now(),
      type: 'text'
    };

    // 通过所有 DataChannel 发送
    let sentCount = 0;
    this.channels.forEach((channel, userId) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          logger.error(`[ChatManager] 发送消息失败 to ${userId}:`, error);
        }
      }
    });

    logger.info(`[ChatManager] 发送消息到 ${sentCount} 个用户`);

    // 添加到本地消息历史
    const localMessage = {
      userId: 'me',
      userName,
      text: message.text,
      timestamp: message.timestamp,
      type: message.type,
      isRemote: false
    };
    
    this.messages.push(localMessage);
    this.emit('message', localMessage);
  }

  /**
   * 发送系统消息（如：用户加入/离开）
   * @param {string} text - 消息内容
   * @param {string} type - 消息类型
   */
  sendSystemMessage(text, type = 'system') {
    const message = {
      userId: 'system',
      userName: '系统',
      text,
      timestamp: Date.now(),
      type,
      isRemote: false
    };

    this.messages.push(message);
    this.emit('message', message);
  }

  /**
   * 获取消息历史
   * @returns {Array} 消息列表
   */
  getMessages() {
    return this.messages;
  }

  /**
   * 清空消息历史
   */
  clearMessages() {
    this.messages = [];
    this.emit('messages-cleared');
  }

  /**
   * 关闭指定用户的 DataChannel
   * @param {string} userId - 用户ID
   */
  closeChannel(userId) {
    const channel = this.channels.get(userId);
    if (channel) {
      try {
        channel.close();
        logger.info(`[ChatManager] 关闭 DataChannel: ${userId}`);
      } catch (error) {
        logger.error(`[ChatManager] 关闭 DataChannel 失败:`, error);
      }
      this.channels.delete(userId);
    }
  }

  /**
   * 关闭所有 DataChannel
   */
  closeAllChannels() {
    logger.info('[ChatManager] 关闭所有 DataChannel');
    
    this.channels.forEach((channel, userId) => {
      try {
        channel.close();
      } catch (error) {
        logger.error(`[ChatManager] 关闭 DataChannel 失败 (${userId}):`, error);
      }
    });
    
    this.channels.clear();
  }

  /**
   * 获取连接状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    const status = {
      totalChannels: this.channels.size,
      openChannels: 0,
      channels: []
    };

    this.channels.forEach((channel, userId) => {
      const channelStatus = {
        userId,
        state: channel.readyState,
        bufferedAmount: channel.bufferedAmount
      };
      
      status.channels.push(channelStatus);
      
      if (channel.readyState === 'open') {
        status.openChannels++;
      }
    });

    return status;
  }

  /**
   * 清理资源
   */
  dispose() {
    logger.info('[ChatManager] 销毁');
    
    this.closeAllChannels();
    this.messages = [];
    this.removeAllListeners();
  }
}

