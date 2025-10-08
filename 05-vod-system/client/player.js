// 从URL获取视频ID
const videoId = window.location.pathname.split('/').pop();
const API_BASE = 'http://localhost:3003/api';

// DOM元素
const videoPlayer = document.getElementById('videoPlayer');
const videoTitle = document.getElementById('videoTitle');
const deleteBtn = document.getElementById('deleteBtn');

// Tab切换
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = {
  'info': document.getElementById('infoTab'),
  'formats': document.getElementById('formatsTab'),
  'tech': document.getElementById('techTab')
};

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;
    
    // 更新按钮状态
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 显示对应内容
    Object.keys(tabContents).forEach(key => {
      tabContents[key].style.display = key === targetTab ? 'block' : 'none';
    });
  });
});

// 全局变量
let currentVideo = null;
let hlsInstance = null;
let statusPollingTimer = null;
let processingStartTime = null;

// 加载视频信息
async function loadVideoInfo() {
  try {
    const response = await fetch(`${API_BASE}/videos/${videoId}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '视频不存在');
    }

    currentVideo = result.data;
    displayVideoInfo();
    
    // 加载播放器
    if (currentVideo.status === 'ready') {
      loadPlayer('hls');
    } else if (currentVideo.status === 'processing') {
      showProcessingState();
      // 每3秒检查一次状态
      startStatusPolling();
    } else if (currentVideo.status === 'error') {
      showErrorState(currentVideo.error || '处理失败');
    } else {
      throw new Error('视频状态异常');
    }

  } catch (error) {
    console.error('加载视频失败:', error);
    alert('加载视频失败: ' + error.message);
    window.location.href = '/';
  }
}

// 显示处理中状态
function showProcessingState() {
  if (!processingStartTime) {
    processingStartTime = Date.now();
  }
  
  const elapsedSeconds = Math.floor((Date.now() - processingStartTime) / 1000);
  const fileSizeMB = (currentVideo.size / (1024 * 1024)).toFixed(0);
  const estimatedSeconds = Math.ceil(fileSizeMB / 3); // 极速模式估算：~3MB/秒
  
  const playerContainer = document.querySelector('.player-container');
  playerContainer.innerHTML = `
    <div class="processing-container">
      <div class="processing-content">
        <div class="processing-spinner">
          <div class="spinner"></div>
        </div>
        
        <h2 class="processing-title">🎬 视频处理中</h2>
        
        <div class="processing-steps">
          <div class="step-item">
            <div class="step-icon">📊</div>
            <div class="step-text">
              <div class="step-name">步骤 1/3: 分析视频信息</div>
              <div class="step-desc">获取视频时长、分辨率等参数</div>
            </div>
          </div>
          
          <div class="step-item active">
            <div class="step-icon">🔄</div>
            <div class="step-text">
              <div class="step-name">步骤 2/3: 转码为HLS格式</div>
              <div class="step-desc">将视频切片，生成流媒体文件（最耗时）</div>
            </div>
          </div>
          
          <div class="step-item">
            <div class="step-icon">🖼️</div>
            <div class="step-text">
              <div class="step-name">步骤 3/3: 生成缩略图</div>
              <div class="step-desc">提取视频预览图</div>
            </div>
          </div>
        </div>
        
        <div class="processing-info">
          <div class="info-row">
            <span class="info-label">📦 文件大小:</span>
            <span class="info-value">${fileSizeMB} MB</span>
          </div>
          <div class="info-row">
            <span class="info-label">⏱️ 预计时间:</span>
            <span class="info-value">${estimatedSeconds < 60 ? estimatedSeconds + ' 秒' : Math.ceil(estimatedSeconds / 60) + ' 分钟'} ⚡ 极速模式</span>
          </div>
          <div class="info-row">
            <span class="info-label">⏲️ 已处理:</span>
            <span class="info-value" id="elapsedTime">${elapsedSeconds} 秒</span>
          </div>
        </div>
        
        <div class="processing-tips">
          <div class="tip-title">💡 温馨提示</div>
          <ul class="tip-list">
            <li>⚡ 使用极速模式：直接复制编码，速度提升10-20倍</li>
            <li>📡 页面自动检测处理状态，无需手动刷新</li>
            <li>✅ 处理完成后自动显示播放器</li>
            <li>🚀 100MB视频通常只需15-30秒</li>
          </ul>
        </div>
        
        <div class="processing-progress">
          <div class="progress-bar-animated">
            <div class="progress-fill-animated"></div>
          </div>
          <div class="progress-text">正在处理中，请稍候...</div>
        </div>
      </div>
    </div>
  `;
  
  // 更新已处理时间
  const updateElapsedTime = setInterval(() => {
    const seconds = Math.floor((Date.now() - processingStartTime) / 1000);
    const elapsedTimeEl = document.getElementById('elapsedTime');
    if (elapsedTimeEl) {
      elapsedTimeEl.textContent = seconds + ' 秒';
    } else {
      clearInterval(updateElapsedTime);
    }
  }, 1000);
}

// 显示错误状态
function showErrorState(errorMessage) {
  const playerContainer = document.querySelector('.player-container');
  playerContainer.innerHTML = `
    <div class="error-container">
      <div class="error-content">
        <div class="error-icon">❌</div>
        <h2 class="error-title">处理失败</h2>
        <p class="error-message">${errorMessage}</p>
        <div class="error-actions">
          <button class="btn btn-primary" onclick="window.location.href='/'">返回列表</button>
          <button class="btn btn-secondary" onclick="window.location.reload()">重新加载</button>
        </div>
      </div>
    </div>
  `;
}

// 状态轮询
function startStatusPolling() {
  statusPollingTimer = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/videos/${videoId}`);
      const result = await response.json();
      
      if (result.success && result.data.status === 'ready') {
        clearInterval(statusPollingTimer);
        // 显示成功提示后刷新
        showSuccessMessage();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (result.success && result.data.status === 'error') {
        clearInterval(statusPollingTimer);
        showErrorState(result.data.error || '处理失败');
      }
    } catch (error) {
      console.error('轮询状态失败:', error);
    }
  }, 3000); // 每3秒检查一次
}

// 显示成功消息
function showSuccessMessage() {
  const processingContainer = document.querySelector('.processing-container');
  if (processingContainer) {
    processingContainer.innerHTML = `
      <div class="success-message">
        <div class="success-icon">✅</div>
        <div class="success-text">处理完成！正在加载播放器...</div>
      </div>
    `;
  }
}

// 显示视频信息
function displayVideoInfo() {
  videoTitle.textContent = currentVideo.title;
  
  document.getElementById('infoTitle').textContent = currentVideo.title;
  document.getElementById('infoDescription').textContent = currentVideo.description || '无描述';
  document.getElementById('infoUploadTime').textContent = new Date(currentVideo.uploadTime).toLocaleString('zh-CN');
  document.getElementById('infoSize').textContent = (currentVideo.size / (1024 * 1024)).toFixed(2) + ' MB';
  document.getElementById('infoDuration').textContent = currentVideo.duration ? formatDuration(currentVideo.duration) : '-';
  document.getElementById('infoResolution').textContent = currentVideo.resolution || '-';
  
  // 显示状态标签
  updateStatusBadge();
}

// 更新状态标签
function updateStatusBadge() {
  const titleElement = document.getElementById('videoTitle');
  const statusBadges = {
    'ready': '<span class="status-badge status-ready">✅ 就绪</span>',
    'processing': '<span class="status-badge status-processing">⏳ 处理中</span>',
    'error': '<span class="status-badge status-error">❌ 错误</span>'
  };
  
  titleElement.innerHTML = currentVideo.title + ' ' + (statusBadges[currentVideo.status] || '');
}

// 加载播放器
function loadPlayer(format) {
  const formatUrls = {
    'hls': currentVideo.formats.hls,
    'original': currentVideo.formats.original
  };

  const videoUrl = formatUrls[format];
  if (!videoUrl) {
    alert('该格式暂不可用');
    return;
  }

  if (format === 'hls' && Hls.isSupported()) {
    // 使用hls.js播放HLS流
    if (hlsInstance) {
      hlsInstance.destroy();
    }

    hlsInstance = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: false
    });

    hlsInstance.loadSource(videoUrl);
    hlsInstance.attachMedia(videoPlayer);

    // HLS事件监听
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('HLS流加载成功');
      videoPlayer.play();
    });

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS错误:', data);
      if (data.fatal) {
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('网络错误，尝试恢复...');
            hlsInstance.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('媒体错误，尝试恢复...');
            hlsInstance.recoverMediaError();
            break;
          default:
            console.error('无法恢复的错误');
            hlsInstance.destroy();
            break;
        }
      }
    });

    // 更新播放统计
    updatePlaybackStats();

  } else if (format === 'original' || videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    // 原生支持或原始视频
    videoPlayer.src = videoUrl;
    videoPlayer.play();
  } else {
    alert('您的浏览器不支持该视频格式');
  }

  // 更新当前格式显示
  document.getElementById('currentFormat').textContent = format === 'hls' ? 'HLS' : '原始视频';
  
  // 更新格式按钮状态
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === format);
  });
}

// 格式切换
document.querySelectorAll('.format-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const format = btn.dataset.format;
    loadPlayer(format);
  });
});

// 更新播放统计信息
function updatePlaybackStats() {
  if (!hlsInstance) return;

  setInterval(() => {
    const stats = hlsInstance.stats;
    const bufferLength = hlsInstance.media ? hlsInstance.media.buffered.length : 0;
    
    document.getElementById('bufferLength').textContent = bufferLength + ' 段';
    
    if (hlsInstance.currentLevel >= 0) {
      const level = hlsInstance.levels[hlsInstance.currentLevel];
      if (level) {
        const bitrate = (level.bitrate / 1000000).toFixed(2);
        document.getElementById('currentBitrate').textContent = bitrate + ' Mbps';
      }
    }
    
    if (videoPlayer.webkitDecodedFrameCount !== undefined) {
      const dropped = videoPlayer.webkitDroppedFrameCount || 0;
      document.getElementById('droppedFrames').textContent = dropped;
    } else {
      document.getElementById('droppedFrames').textContent = 'N/A';
    }
  }, 1000);
}

// 删除视频
deleteBtn.addEventListener('click', async () => {
  if (!confirm('确定要删除这个视频吗？此操作不可恢复！')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/videos/${videoId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '删除失败');
    }

    alert('视频已删除');
    window.location.href = '/';

  } catch (error) {
    console.error('删除视频失败:', error);
    alert('删除失败: ' + error.message);
  }
});

// 格式化时长
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (hlsInstance) {
    hlsInstance.destroy();
  }
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
  }
});

// 加载视频
loadVideoInfo();

