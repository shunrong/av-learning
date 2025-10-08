// API基础URL
const API_BASE = 'http://localhost:3003/api';

// DOM元素
const uploadForm = document.getElementById('uploadForm');
const videoFile = document.getElementById('videoFile');
const videoTitle = document.getElementById('videoTitle');
const fileInfo = document.getElementById('fileInfo');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const videoList = document.getElementById('videoList');
const refreshBtn = document.getElementById('refreshBtn');

// 文件选择事件
videoFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.textContent = `已选择: ${file.name} (${sizeMB} MB)`;
    
    // 如果没有填写标题，使用文件名
    if (!videoTitle.value) {
      videoTitle.value = file.name.replace(/\.[^/.]+$/, '');
    }
  }
});

// 上传表单提交
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = videoFile.files[0];
  if (!file) {
    alert('请选择视频文件');
    return;
  }

  const formData = new FormData();
  formData.append('video', file);
  formData.append('title', videoTitle.value || file.name);
  formData.append('description', document.getElementById('videoDescription').value);

  try {
    // 显示上传进度
    uploadBtn.disabled = true;
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '上传中...';

    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + '%';
        progressText.textContent = `上传中... ${percent}%`;
      }
    });

    // 上传完成
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        progressText.textContent = '上传成功！正在处理视频...';
        progressFill.style.width = '100%';
        
        // 重置表单
        setTimeout(() => {
          uploadForm.reset();
          fileInfo.textContent = '';
          uploadProgress.style.display = 'none';
          uploadBtn.disabled = false;
          
          // 刷新视频列表
          loadVideos();
        }, 2000);
      } else {
        throw new Error('上传失败');
      }
    });

    // 上传错误
    xhr.addEventListener('error', () => {
      progressText.textContent = '上传失败';
      uploadBtn.disabled = false;
      alert('上传失败，请重试');
    });

    xhr.open('POST', `${API_BASE}/upload`);
    xhr.send(formData);

  } catch (error) {
    console.error('上传错误:', error);
    alert('上传失败: ' + error.message);
    uploadBtn.disabled = false;
    uploadProgress.style.display = 'none';
  }
});

// 刷新视频列表
refreshBtn.addEventListener('click', () => {
  loadVideos();
});

// 加载视频列表
async function loadVideos() {
  try {
    videoList.innerHTML = '<div class="loading">加载中...</div>';
    
    const response = await fetch(`${API_BASE}/videos`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '加载失败');
    }

    const videos = result.data;

    if (videos.length === 0) {
      videoList.innerHTML = `
        <div class="empty-state">
          <p>📭 还没有视频</p>
          <p style="margin-top: 10px; font-size: 0.9rem;">上传您的第一个视频开始体验吧！</p>
        </div>
      `;
      return;
    }

    // 渲染视频卡片
    videoList.innerHTML = videos.map(video => createVideoCard(video)).join('');

    // 添加点击事件
    document.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', () => {
        const videoId = card.dataset.videoId;
        window.location.href = `/player/${videoId}`;
      });
    });

  } catch (error) {
    console.error('加载视频列表失败:', error);
    videoList.innerHTML = `
      <div class="empty-state">
        <p>❌ 加载失败</p>
        <p style="margin-top: 10px; font-size: 0.9rem;">${error.message}</p>
      </div>
    `;
  }
}

// 创建视频卡片HTML
function createVideoCard(video) {
  const statusClass = `status-${video.status}`;
  const statusText = {
    'ready': '✅ 就绪',
    'processing': '⏳ 处理中',
    'error': '❌ 错误'
  }[video.status] || video.status;

  const uploadDate = new Date(video.uploadTime).toLocaleDateString('zh-CN');
  const fileSize = (video.size / (1024 * 1024)).toFixed(2);

  // 处理中状态显示预估时间
  let processingTip = '';
  if (video.status === 'processing') {
    const estimatedSeconds = Math.ceil(fileSize / 3); // 极速模式
    const timeText = estimatedSeconds < 60 
      ? `${estimatedSeconds} 秒` 
      : `${Math.ceil(estimatedSeconds / 60)} 分钟`;
    processingTip = `<div class="processing-tip">⚡ 预计 ${timeText}</div>`;
  }

  const thumbnail = video.formats.thumbnail 
    ? `<img src="${video.formats.thumbnail}" alt="${video.title}">`
    : (video.status === 'processing' ? '<div class="thumbnail-processing">⏳<br>处理中</div>' : '🎬');

  return `
    <div class="video-card ${video.status === 'processing' ? 'card-processing' : ''}" data-video-id="${video.id}">
      <div class="video-thumbnail">
        ${thumbnail}
      </div>
      <div class="video-card-body">
        <div class="video-title">${escapeHtml(video.title)}</div>
        ${video.description ? `<div class="video-description">${escapeHtml(video.description)}</div>` : ''}
        ${processingTip}
        <div class="video-meta">
          <span>${uploadDate} · ${fileSize} MB</span>
          <span class="video-status ${statusClass}">${statusText}</span>
        </div>
      </div>
    </div>
  `;
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 格式化时长
function formatDuration(seconds) {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 页面加载时获取视频列表
loadVideos();

// 定期刷新列表以更新处理状态
setInterval(() => {
  const processingCards = document.querySelectorAll('.status-processing');
  if (processingCards.length > 0) {
    loadVideos();
  }
}, 5000); // 每5秒刷新一次

