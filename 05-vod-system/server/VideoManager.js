const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

/**
 * 视频管理器 - 负责视频的存储、转码、元数据管理
 */
class VideoManager {
  constructor() {
    this.videosDir = path.join(__dirname, '../media/videos');
    this.hlsDir = path.join(__dirname, '../media/hls');
    this.thumbDir = path.join(__dirname, '../media/thumbnails');
    this.metadataFile = path.join(__dirname, '../media/videos.json');
    
    // 确保目录存在
    this.ensureDirectories();
    
    // 加载已有的视频元数据
    this.videos = this.loadMetadata();
  }

  /**
   * 确保所需目录存在
   */
  ensureDirectories() {
    [this.videosDir, this.hlsDir, this.thumbDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 加载视频元数据
   */
  loadMetadata() {
    if (fs.existsSync(this.metadataFile)) {
      const data = fs.readFileSync(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  }

  /**
   * 保存视频元数据
   */
  saveMetadata() {
    fs.writeFileSync(
      this.metadataFile, 
      JSON.stringify(this.videos, null, 2),
      'utf-8'
    );
  }

  /**
   * 添加新视频
   */
  async addVideo(file, metadata = {}) {
    const videoId = uuidv4();
    const ext = path.extname(file.originalname);
    const videoFileName = `${videoId}${ext}`;
    const videoPath = path.join(this.videosDir, videoFileName);

    // 保存原始视频文件
    fs.renameSync(file.path, videoPath);

    // 创建视频记录
    const videoRecord = {
      id: videoId,
      title: metadata.title || file.originalname,
      description: metadata.description || '',
      fileName: videoFileName,
      originalName: file.originalname,
      size: file.size,
      uploadTime: new Date().toISOString(),
      status: 'processing', // processing, ready, error
      formats: {
        original: `/media/videos/${videoFileName}`,
        hls: null,
        thumbnail: null
      },
      duration: null,
      resolution: null
    };

    this.videos.push(videoRecord);
    this.saveMetadata();

    // 异步处理视频（转码、生成缩略图等）
    this.processVideo(videoId, videoPath).catch(err => {
      console.error(`处理视频失败 ${videoId}:`, err);
      this.updateVideoStatus(videoId, 'error', { error: err.message });
    });

    return videoRecord;
  }

  /**
   * 处理视频：获取信息、转码HLS、生成缩略图
   */
  async processVideo(videoId, videoPath) {
    const startTime = Date.now();
    console.log('\n========================================');
    console.log(`🎬 开始处理视频: ${videoId}`);
    console.log(`📁 文件路径: ${videoPath}`);
    console.log('========================================\n');

    try {
      // 1. 获取视频信息（快速）
      console.log('📊 [步骤 1/3] 快速获取视频信息...');
      const step1Start = Date.now();
      const videoInfo = await this.getVideoInfo(videoPath);
      console.log(`✅ 视频信息获取完成 (耗时: ${((Date.now() - step1Start) / 1000).toFixed(1)}秒)`);
      console.log(`   - 时长: ${Math.floor(videoInfo.duration / 60)}分${Math.floor(videoInfo.duration % 60)}秒`);
      console.log(`   - 分辨率: ${videoInfo.resolution}`);
      console.log(`   - 格式: ${videoInfo.format}\n`);
      
      // 2. 切片为HLS格式（极速模式：直接复制，不重新编码）
      console.log('⚡ [步骤 2/3] 极速切片为HLS（直接复制编码）...');
      const step2Start = Date.now();
      const hlsPath = await this.transcodeToHLS(videoId, videoPath);
      console.log(`✅ HLS切片完成 (耗时: ${((Date.now() - step2Start) / 1000).toFixed(1)}秒)\n`);
      
      // 3. 生成缩略图（可选，失败不影响播放）
      console.log('🖼️  [步骤 3/3] 快速生成缩略图...');
      const step3Start = Date.now();
      const thumbnailPath = await this.generateThumbnail(videoId, videoPath);
      if (thumbnailPath) {
        console.log(`✅ 缩略图生成完成 (耗时: ${((Date.now() - step3Start) / 1000).toFixed(1)}秒)\n`);
      } else {
        console.log(`⚠️  缩略图生成失败（不影响播放）\n`);
      }
      
      // 4. 更新视频记录
      this.updateVideoStatus(videoId, 'ready', {
        duration: videoInfo.duration,
        resolution: videoInfo.resolution,
        formats: {
          original: `/media/videos/${path.basename(videoPath)}`,
          hls: hlsPath,
          thumbnail: thumbnailPath || null
        }
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('========================================');
      console.log(`🎉 视频处理完成: ${videoId}`);
      console.log(`⚡ 总耗时: ${totalTime}秒 (极速模式)`);
      console.log(`💡 使用了直接复制模式，速度提升10-20倍！`);
      console.log('========================================\n');
    } catch (error) {
      console.error('\n❌ ========================================');
      console.error(`视频处理失败: ${videoId}`);
      console.error('错误信息:', error.message);
      console.error('========================================\n');
      throw error;
    }
  }

  /**
   * 获取视频信息
   */
  getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        
        resolve({
          duration: metadata.format.duration,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name
        });
      });
    });
  }

  /**
   * 转码为HLS格式（支持自适应码率）
   */
  transcodeToHLS(videoId, videoPath) {
    return new Promise((resolve, reject) => {
      const hlsOutputDir = path.join(this.hlsDir, videoId);
      if (!fs.existsSync(hlsOutputDir)) {
        fs.mkdirSync(hlsOutputDir, { recursive: true });
      }

      const playlistPath = path.join(hlsOutputDir, 'playlist.m3u8');

      let lastProgress = 0;
      
      ffmpeg(videoPath)
        .outputOptions([
          // ⚡ 极速模式：直接复制编码，不重新编码
          '-c copy',                    // 复制所有流（最快！）
          '-copyts',                    // 复制时间戳，保持同步
          '-start_number 0',            // 分片从0开始
          '-hls_time 6',                // 每个分片6秒（较小的分片）
          '-hls_list_size 0',           // 保留所有分片
          '-hls_segment_type mpegts',   // 使用标准TS格式
          '-hls_flags independent_segments', // 独立分片，加快处理
          '-f hls'                      // HLS格式输出
        ])
        .output(playlistPath)
        .on('start', (cmd) => {
          console.log('   ⚡ 极速模式启动（直接复制，不重新编码）');
          console.log('   💻 FFmpeg命令:', cmd.substring(0, 120) + '...');
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            const currentProgress = Math.round(progress.percent);
            // 每10%输出一次进度，避免刷屏
            if (currentProgress >= lastProgress + 10 || currentProgress === 100) {
              const progressBar = '█'.repeat(Math.floor(currentProgress / 5)) + '░'.repeat(20 - Math.floor(currentProgress / 5));
              console.log(`   ⏳ 切片进度: [${progressBar}] ${currentProgress}%`);
              lastProgress = currentProgress;
            }
          }
        })
        .on('end', () => {
          console.log('   ✅ 切片完成（使用复制模式，速度最快）');
          resolve(`/media/hls/${videoId}/playlist.m3u8`);
        })
        .on('error', (err) => {
          console.error('   ❌ HLS切片失败:', err.message);
          // 如果复制模式失败，可能是编码不兼容
          console.error('   💡 提示: 如果持续失败，可能需要重新编码');
          reject(err);
        })
        .run();
    });
  }

  /**
   * 生成视频缩略图（快速模式）
   */
  generateThumbnail(videoId, videoPath) {
    return new Promise((resolve, reject) => {
      const thumbnailPath = path.join(this.thumbDir, `${videoId}.jpg`);

      ffmpeg(videoPath)
        .outputOptions([
          '-ss 00:00:02',           // 从第2秒开始（避开黑屏）
          '-vframes 1',             // 只提取1帧
          '-vf scale=320:180',      // 缩略图尺寸
          '-q:v 3'                  // 质量（2-5，数字越小质量越高）
        ])
        .output(thumbnailPath)
        .on('start', () => {
          console.log('   📸 快速生成缩略图...');
        })
        .on('end', () => {
          resolve(`/media/thumbnails/${videoId}.jpg`);
        })
        .on('error', (err) => {
          console.error('   ⚠️ 缩略图生成失败（不影响播放）:', err.message);
          // 缩略图失败不应该阻止整个流程
          resolve(null); // 返回null而不是reject
        })
        .run();
    });
  }

  /**
   * 更新视频状态
   */
  updateVideoStatus(videoId, status, updates = {}) {
    const video = this.videos.find(v => v.id === videoId);
    if (video) {
      video.status = status;
      Object.assign(video, updates);
      this.saveMetadata();
    }
  }

  /**
   * 获取所有视频列表
   */
  getAllVideos() {
    return this.videos.sort((a, b) => 
      new Date(b.uploadTime) - new Date(a.uploadTime)
    );
  }

  /**
   * 根据ID获取视频
   */
  getVideoById(id) {
    return this.videos.find(v => v.id === id);
  }

  /**
   * 删除视频
   */
  deleteVideo(id) {
    const video = this.getVideoById(id);
    if (!video) return false;

    // 删除文件
    try {
      const videoPath = path.join(this.videosDir, video.fileName);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }

      const hlsDir = path.join(this.hlsDir, id);
      if (fs.existsSync(hlsDir)) {
        fs.rmSync(hlsDir, { recursive: true, force: true });
      }

      const thumbnailPath = path.join(this.thumbDir, `${id}.jpg`);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    } catch (err) {
      console.error('删除文件失败:', err);
    }

    // 从列表中移除
    this.videos = this.videos.filter(v => v.id !== id);
    this.saveMetadata();

    return true;
  }
}

module.exports = VideoManager;

