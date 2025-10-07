/**
 * 事件发射器基类
 * 提供发布-订阅模式的事件系统
 */
export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    
    if (callbacks.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {...any} args - 传递给回调的参数
   */
  emit(event, ...args) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`事件 ${event} 的回调执行出错:`, error);
      }
    });
  }

  /**
   * 清空所有事件监听
   */
  removeAllListeners() {
    this.events.clear();
  }
}

