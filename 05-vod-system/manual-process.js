// 手动触发视频处理
const VideoManager = require('./server/VideoManager');
const path = require('path');

async function processVideo() {
  const videoManager = new VideoManager();
  const videoId = 'a2f10188-19b2-4eb6-bcae-61aa4d2d5955';
  const videoPath = path.join(__dirname, 'media/videos', `${videoId}.mp4`);
  
  console.log('🔧 手动触发视频处理...');
  console.log(`📁 视频ID: ${videoId}`);
  console.log(`📂 视频路径: ${videoPath}`);
  console.log('');
  
  try {
    await videoManager.processVideo(videoId, videoPath);
    console.log('✅ 处理完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

processVideo();

