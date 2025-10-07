/**
 * PeerConnection 管理器
 * 负责管理多个 RTCPeerConnection 实例
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { logger } from '../utils/logger.js';

export class PeerConnectionManager extends EventEmitter {
  constructor(iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]) {
    super();
    this.config = { iceServers };
    this.peerConnections = new Map(); // Map<userId, RTCPeerConnection>
    this.pendingCandidates = new Map(); // Map<userId, ICECandidate[]>
    this.chatManager = null; // ChatManager 实例
  }

  /**
   * 设置 ChatManager 实例
   * @param {ChatManager} chatManager - 聊天管理器实例
   */
  setChatManager(chatManager) {
    this.chatManager = chatManager;
    logger.info('[PCManager] 设置 ChatManager');
  }

  /**
   * 为指定用户创建 PeerConnection
   * @param {string} userId - 用户ID
   * @param {MediaStream} localStream - 本地媒体流
   * @param {Object} options - 选项
   * @param {boolean} options.createDataChannel - 是否创建 DataChannel (发起方为 true)
   * @param {string} options.userName - 用户名
   */
  createPeerConnection(userId, localStream, options = {}) {
    const { createDataChannel = false, userName = userId } = options;
    
    if (this.peerConnections.has(userId)) {
      logger.warn(`PeerConnection for ${userId} 已存在`);
      return this.peerConnections.get(userId);
    }

    logger.info(`创建 PeerConnection for ${userName}(${userId})`);
    
    const pc = new RTCPeerConnection(this.config);

    // 添加本地媒体轨道
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        logger.debug(`添加本地 ${track.kind} track to ${userId}`);
      });
    }

    // 监听 ICE 候选者
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logger.debug(`ICE candidate for ${userId}:`, event.candidate);
        this.emit('ice-candidate', { userId, candidate: event.candidate });
      } else {
        logger.debug(`ICE 收集完成 for ${userId}`);
      }
    };

    // 监听连接状态变化
    pc.onconnectionstatechange = () => {
      logger.info(`PeerConnection state for ${userId}:`, pc.connectionState);
      this.emit('connection-state-change', { 
        userId, 
        state: pc.connectionState 
      });

      if (pc.connectionState === 'failed') {
        logger.error(`连接失败 for ${userId}`);
        this.emit('connection-failed', { userId });
      }
    };

    // 监听 ICE 连接状态
    pc.oniceconnectionstatechange = () => {
      logger.debug(`ICE state for ${userId}:`, pc.iceConnectionState);
      this.emit('ice-connection-state-change', {
        userId,
        state: pc.iceConnectionState
      });
    };

    // 监听远程媒体流
    pc.ontrack = (event) => {
      logger.info(`收到远程 ${event.track.kind} track from ${userId}`);
      this.emit('remote-track', { 
        userId, 
        track: event.track,
        streams: event.streams 
      });
    };

    // 存储 PeerConnection
    this.peerConnections.set(userId, pc);
    
    // 创建 DataChannel (如果已设置 ChatManager)
    if (this.chatManager) {
      this.chatManager.createDataChannel(userId, userName, pc, createDataChannel);
      logger.debug(`[PCManager] DataChannel 创建请求已发送 for ${userName}`);
    }
    
    return pc;
  }

  /**
   * 创建 Offer
   */
  async createOffer(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      throw new Error(`No PeerConnection for ${userId}`);
    }

    try {
      logger.info(`创建 Offer for ${userId}`);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      logger.debug(`Offer created for ${userId}:`, offer);
      return offer;
    } catch (error) {
      logger.error(`创建 Offer 失败 for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 创建 Answer
   */
  async createAnswer(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      throw new Error(`No PeerConnection for ${userId}`);
    }

    try {
      logger.info(`创建 Answer for ${userId}`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      logger.debug(`Answer created for ${userId}:`, answer);
      return answer;
    } catch (error) {
      logger.error(`创建 Answer 失败 for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 设置远程描述
   */
  async setRemoteDescription(userId, description) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      throw new Error(`No PeerConnection for ${userId}`);
    }

    try {
      logger.info(`设置远程描述 for ${userId}:`, description.type);
      await pc.setRemoteDescription(new RTCSessionDescription(description));
      
      // 处理待处理的 ICE 候选者
      if (this.pendingCandidates.has(userId)) {
        const candidates = this.pendingCandidates.get(userId);
        logger.info(`添加 ${candidates.length} 个待处理的 ICE 候选者 for ${userId}`);
        
        for (const candidate of candidates) {
          await this.addIceCandidate(userId, candidate);
        }
        
        this.pendingCandidates.delete(userId);
      }
    } catch (error) {
      logger.error(`设置远程描述失败 for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 添加 ICE 候选者
   */
  async addIceCandidate(userId, candidate) {
    const pc = this.peerConnections.get(userId);
    if (!pc) {
      logger.warn(`No PeerConnection for ${userId}, 将候选者加入待处理队列`);
      return;
    }

    // 如果远程描述还未设置，将候选者加入待处理队列
    if (!pc.remoteDescription) {
      logger.debug(`远程描述未设置 for ${userId}, 候选者加入待处理队列`);
      if (!this.pendingCandidates.has(userId)) {
        this.pendingCandidates.set(userId, []);
      }
      this.pendingCandidates.get(userId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      logger.debug(`添加 ICE 候选者成功 for ${userId}`);
    } catch (error) {
      logger.error(`添加 ICE 候选者失败 for ${userId}:`, error);
    }
  }

  /**
   * 关闭并移除指定用户的连接
   */
  closePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      // 关闭 DataChannel
      if (this.chatManager) {
        this.chatManager.closeChannel(userId);
      }
      
      pc.close();
      this.peerConnections.delete(userId);
      this.pendingCandidates.delete(userId);
      logger.info(`已关闭 PeerConnection for ${userId}`);
    }
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections() {
    logger.info('关闭所有 PeerConnection');
    
    // 关闭所有 DataChannel
    if (this.chatManager) {
      this.chatManager.closeAllChannels();
    }
    
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
      logger.debug(`关闭 PeerConnection for ${userId}`);
    });
    this.peerConnections.clear();
    this.pendingCandidates.clear();
  }

  /**
   * 获取连接数量
   */
  getConnectionCount() {
    return this.peerConnections.size;
  }

  /**
   * 获取所有连接的用户ID
   */
  getConnectedUsers() {
    return Array.from(this.peerConnections.keys());
  }

  /**
   * 获取连接统计信息
   */
  async getStats(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return null;

    try {
      const stats = await pc.getStats();
      return stats;
    } catch (error) {
      logger.error(`获取统计信息失败 for ${userId}:`, error);
      return null;
    }
  }

  /**
   * 清理所有资源
   */
  dispose() {
    this.closeAllConnections();
    this.removeAllListeners();
    logger.info('PeerConnectionManager 已清理');
  }
}

