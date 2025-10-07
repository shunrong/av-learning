/**
 * 日志工具
 * 提供统一的日志输出和调试功能
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS.DEBUG;
    this.prefix = '[WebRTC]';
  }

  setLevel(level) {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  setPrefix(prefix) {
    this.prefix = prefix;
  }

  _log(level, color, ...args) {
    if (this.level > level) return;
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `%c${this.prefix} ${timestamp}`,
      `color: ${color}; font-weight: bold`,
      ...args
    );
  }

  debug(...args) {
    this._log(LOG_LEVELS.DEBUG, '#888', '[DEBUG]', ...args);
  }

  info(...args) {
    this._log(LOG_LEVELS.INFO, '#2196F3', '[INFO]', ...args);
  }

  warn(...args) {
    this._log(LOG_LEVELS.WARN, '#FF9800', '[WARN]', ...args);
  }

  error(...args) {
    this._log(LOG_LEVELS.ERROR, '#F44336', '[ERROR]', ...args);
  }

  group(label) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  groupEnd() {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.groupEnd();
    }
  }
}

// 导出单例
export const logger = new Logger();

