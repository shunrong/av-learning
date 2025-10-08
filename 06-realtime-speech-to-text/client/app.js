/**
 * 实时语音转文字 - 主应用
 */

class SpeechToTextApp {
  constructor() {
    this.ws = null;
    this.recorder = null;
    this.isConnected = false;
    this.transcriptHistory = [];
    
    this.initElements();
    this.checkBrowserSupport();
  }

  /**
   * 初始化DOM元素
   */
  initElements() {
    // 按钮
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.exportBtn = document.getElementById('exportBtn');
    
    // 显示区域
    this.statusEl = document.getElementById('status');
    this.transcriptEl = document.getElementById('transcript');
    this.volumeBar = document.getElementById('volumeBar');
    this.volumeValue = document.getElementById('volumeValue');
    this.connectionStatus = document.getElementById('connectionStatus');
    
    // 绑定事件
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.clearBtn.addEventListener('click', () => this.clearTranscript());
    this.exportBtn.addEventListener('click', () => this.exportTranscript());
  }

  /**
   * 检查浏览器支持
   */
  checkBrowserSupport() {
    if (!AudioRecorder.isSupported()) {
      this.showError('您的浏览器不支持录音功能，请使用Chrome、Edge或Firefox浏览器');
      this.startBtn.disabled = true;
      return false;
    }
    return true;
  }

  /**
   * 连接WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${window.location.hostname}:${window.location.port || 3000}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket连接成功');
          this.isConnected = true;
          this.updateConnectionStatus(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket错误:', error);
          this.isConnected = false;
          this.updateConnectionStatus(false);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket连接关闭');
          this.isConnected = false;
          this.updateConnectionStatus(false);
          
          // 如果正在录音，停止录音
          if (this.recorder && this.recorder.isRecording) {
            this.stop();
            this.showError('与服务器断开连接');
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理服务器消息
   */
  handleServerMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connected':
          console.log('📡 服务器消息:', message.message);
          break;

        case 'result':
          this.handleRecognitionResult(message.data);
          break;

        case 'error':
          this.showError(message.message);
          break;

        case 'started':
        case 'stopped':
          console.log('📨 服务器响应:', message.message);
          break;

        default:
          console.log('📩 未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('❌ 解析服务器消息失败:', error);
    }
  }

  /**
   * 处理识别结果
   */
  handleRecognitionResult(data) {
    const { text, isFinal, confidence, timestamp } = data;
    
    // 创建结果项
    const resultItem = {
      text: text,
      isFinal: isFinal,
      confidence: confidence,
      timestamp: new Date(timestamp)
    };

    // 添加到历史记录
    this.transcriptHistory.push(resultItem);

    // 更新显示
    this.appendTranscript(resultItem);

    // 自动滚动到底部
    this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
  }

  /**
   * 添加识别结果到显示区域
   */
  appendTranscript(result) {
    const item = document.createElement('div');
    item.className = `transcript-item ${result.isFinal ? 'final' : 'interim'}`;
    
    const timeStr = result.timestamp.toLocaleTimeString('zh-CN');
    
    item.innerHTML = `
      <div class="transcript-time">${timeStr}</div>
      <div class="transcript-text">${this.escapeHtml(result.text)}</div>
      <div class="transcript-meta">
        ${result.isFinal ? '<span class="badge final">最终</span>' : '<span class="badge interim">临时</span>'}
        <span class="confidence">置信度: ${result.confidence}</span>
      </div>
    `;
    
    this.transcriptEl.appendChild(item);
  }

  /**
   * 开始录音
   */
  async start() {
    try {
      this.showStatus('正在初始化...', 'info');
      this.startBtn.disabled = true;

      // 连接WebSocket
      if (!this.isConnected) {
        await this.connectWebSocket();
      }

      // 初始化录音器
      this.recorder = new AudioRecorder(
        (audioData) => this.sendAudioData(audioData),
        (volume) => this.updateVolume(volume)
      );

      await this.recorder.init();
      
      // 发送开始命令
      this.ws.send(JSON.stringify({ type: 'start' }));
      
      // 开始录音
      this.recorder.start();

      // 更新UI
      this.showStatus('正在录音...', 'recording');
      this.startBtn.style.display = 'none';
      this.stopBtn.style.display = 'inline-flex';
      this.pauseBtn.style.display = 'inline-flex';
      this.clearBtn.disabled = false;
      this.exportBtn.disabled = false;

    } catch (error) {
      console.error('❌ 启动失败:', error);
      this.showError(error.message);
      this.startBtn.disabled = false;
    }
  }

  /**
   * 停止录音
   */
  stop() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder.destroy();
      this.recorder = null;
    }

    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'stop' }));
    }

    // 更新UI
    this.showStatus('已停止', 'idle');
    this.startBtn.style.display = 'inline-flex';
    this.startBtn.disabled = false;
    this.stopBtn.style.display = 'none';
    this.pauseBtn.style.display = 'none';
    this.pauseBtn.textContent = '⏸️ 暂停';
    this.updateVolume(0);
  }

  /**
   * 切换暂停/恢复
   */
  togglePause() {
    if (!this.recorder) return;

    const state = this.recorder.getState();
    
    if (state.recorderState === 'recording') {
      this.recorder.pause();
      this.pauseBtn.textContent = '▶️ 继续';
      this.showStatus('已暂停', 'paused');
    } else if (state.recorderState === 'paused') {
      this.recorder.resume();
      this.pauseBtn.textContent = '⏸️ 暂停';
      this.showStatus('正在录音...', 'recording');
    }
  }

  /**
   * 清空转写内容
   */
  clearTranscript() {
    if (this.transcriptHistory.length === 0) return;

    if (confirm('确定要清空所有转写内容吗？')) {
      this.transcriptHistory = [];
      this.transcriptEl.innerHTML = '<div class="empty-state">开始录音后，识别的文字将显示在这里</div>';
    }
  }

  /**
   * 导出转写内容
   */
  exportTranscript() {
    if (this.transcriptHistory.length === 0) {
      alert('没有可导出的内容');
      return;
    }

    // 生成文本内容
    let content = '实时语音转文字记录\n';
    content += '=' .repeat(50) + '\n';
    content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    content += `总计条目: ${this.transcriptHistory.length}\n`;
    content += '=' .repeat(50) + '\n\n';

    this.transcriptHistory.forEach((item, index) => {
      const timeStr = item.timestamp.toLocaleTimeString('zh-CN');
      const typeStr = item.isFinal ? '[最终]' : '[临时]';
      content += `${index + 1}. ${timeStr} ${typeStr}\n`;
      content += `   ${item.text}\n`;
      content += `   (置信度: ${item.confidence})\n\n`;
    });

    // 下载文件
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `语音转文字_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus('导出成功', 'success');
    setTimeout(() => {
      if (this.recorder && this.recorder.isRecording) {
        this.showStatus('正在录音...', 'recording');
      }
    }, 2000);
  }

  /**
   * 发送音频数据
   */
  sendAudioData(audioData) {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  /**
   * 更新音量显示
   */
  updateVolume(volume) {
    this.volumeBar.style.width = `${volume}%`;
    this.volumeValue.textContent = `${volume}%`;
    
    // 根据音量改变颜色
    if (volume < 30) {
      this.volumeBar.style.background = '#10b981';
    } else if (volume < 70) {
      this.volumeBar.style.background = '#f59e0b';
    } else {
      this.volumeBar.style.background = '#ef4444';
    }
  }

  /**
   * 更新连接状态
   */
  updateConnectionStatus(connected) {
    if (connected) {
      this.connectionStatus.innerHTML = '<span class="status-dot connected"></span> 已连接';
      this.connectionStatus.className = 'connection-status connected';
    } else {
      this.connectionStatus.innerHTML = '<span class="status-dot disconnected"></span> 未连接';
      this.connectionStatus.className = 'connection-status disconnected';
    }
  }

  /**
   * 显示状态
   */
  showStatus(message, type = 'info') {
    this.statusEl.textContent = message;
    this.statusEl.className = `status ${type}`;
  }

  /**
   * 显示错误
   */
  showError(message) {
    this.showStatus(`错误: ${message}`, 'error');
    console.error('❌', message);
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SpeechToTextApp();
  console.log('🎤 应用已初始化');
});

