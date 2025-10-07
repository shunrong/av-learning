/**
 * 房间管理器
 * 管理所有房间和用户
 */

class RoomManager {
  constructor() {
    this.rooms = new Map(); // Map<roomId, Room>
    this.userToRoom = new Map(); // Map<userId, roomId>
  }

  /**
   * 用户加入房间
   */
  joinRoom(roomId, userId, userName, ws) {
    // 创建房间（如果不存在）
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        roomId,
        users: new Map() // Map<userId, UserInfo>
      });
      console.log(`✅ 创建房间: ${roomId}`);
    }

    const room = this.rooms.get(roomId);
    
    // 添加用户到房间
    room.users.set(userId, {
      userId,
      userName,
      ws,
      joinedAt: Date.now()
    });

    // 记录用户所在房间
    this.userToRoom.set(userId, roomId);

    console.log(`✅ 用户 ${userName}(${userId}) 加入房间 ${roomId}`);
    console.log(`   当前房间人数: ${room.users.size}`);

    return {
      room,
      existingUsers: this._getOtherUsers(roomId, userId)
    };
  }

  /**
   * 用户离开房间
   */
  leaveRoom(userId) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) {
      console.log(`⚠️  用户 ${userId} 不在任何房间中`);
      return null;
    }

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const user = room.users.get(userId);
    room.users.delete(userId);
    this.userToRoom.delete(userId);

    console.log(`❌ 用户 ${user?.userName}(${userId}) 离开房间 ${roomId}`);
    console.log(`   当前房间人数: ${room.users.size}`);

    // 如果房间为空，删除房间
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      console.log(`❌ 删除空房间: ${roomId}`);
    }

    return { roomId, user, room };
  }

  /**
   * 获取房间内的其他用户
   */
  _getOtherUsers(roomId, excludeUserId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.users.values())
      .filter(u => u.userId !== excludeUserId)
      .map(u => ({
        userId: u.userId,
        userName: u.userName
      }));
  }

  /**
   * 获取用户所在的房间
   */
  getUserRoom(userId) {
    const roomId = this.userToRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  /**
   * 向房间内所有用户广播消息（除了发送者）
   */
  broadcastToRoom(roomId, senderId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    let count = 0;
    room.users.forEach((user, userId) => {
      if (userId !== senderId && user.ws.readyState === 1) { // 1 = OPEN
        user.ws.send(JSON.stringify(message));
        count++;
      }
    });

    console.log(`📤 向房间 ${roomId} 广播消息 (${count} 人)`);
  }

  /**
   * 向特定用户发送消息
   */
  sendToUser(userId, message) {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const user = room.users.get(userId);
    if (user && user.ws.readyState === 1) {
      user.ws.send(JSON.stringify(message));
      return true;
    }

    return false;
  }

  /**
   * 获取房间统计信息
   */
  getStats() {
    const stats = {
      totalRooms: this.rooms.size,
      totalUsers: this.userToRoom.size,
      rooms: []
    };

    this.rooms.forEach((room, roomId) => {
      stats.rooms.push({
        roomId,
        userCount: room.users.size,
        users: Array.from(room.users.values()).map(u => ({
          userId: u.userId,
          userName: u.userName
        }))
      });
    });

    return stats;
  }

  /**
   * 打印统计信息
   */
  printStats() {
    const stats = this.getStats();
    console.log('\n========== 房间统计 ==========');
    console.log(`总房间数: ${stats.totalRooms}`);
    console.log(`总用户数: ${stats.totalUsers}`);
    stats.rooms.forEach(room => {
      console.log(`\n房间: ${room.roomId}`);
      console.log(`  人数: ${room.userCount}`);
      room.users.forEach(u => {
        console.log(`  - ${u.userName} (${u.userId})`);
      });
    });
    console.log('==============================\n');
  }
}

module.exports = RoomManager;

