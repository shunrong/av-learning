/**
 * 直播推流器
 * 
 * 这个类展示了直播平台的主播端软件如何调用 FFmpeg
 * 主播只需要点击"开始直播"按钮，代码会自动调用 FFmpeg
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class LivePublisher extends EventEmitter {
  constructor() {
    super();
    this.ffmpegProcess = null;
    this.isLive = false;
    this.stats = {
      fps: 0,
      bitrate: 0,
      quality: 0,
      duration: 0
    };
  }

  /**
   * 开始直播
   * @param {Object} config 配置
   */
  startLive(config) {
    if (this.isLive) {
      throw new Error('已经在直播中');
    }

    const {
      rtmpUrl,
      inputType = 'device',  // 'device' 或 'file'
      inputSource = '0:0',   // 设备索引或文件路径
      quality = 'medium'
    } = config;

    // 画质预设
    const qualityPresets = {
      low: {
        resolution: '854x480',
        videoBitrate: '800k',
        audioBitrate: '64k',
        fps: 25,
        preset: 'veryfast'
      },
      medium: {
        resolution: '1280x720',
        videoBitrate: '2000k',
        audioBitrate: '128k',
        fps: 30,
        preset: 'fast'
      },
      high: {
        resolution: '1920x1080',
        videoBitrate: '4000k',
        audioBitrate: '192k',
        fps: 30,
        preset: 'medium'
      },
      ultra: {
        resolution: '1920x1080',
        videoBitrate: '6000k',
        audioBitrate: '256k',
        fps: 60,
        preset: 'medium'
      }
    };

    const preset = qualityPresets[quality];

    // 构建 FFmpeg 参数
    let ffmpegArgs = [];

    if (inputType === 'device') {
      // 摄像头输入
      ffmpegArgs = [
        '-f', 'avfoundation',
        '-framerate', preset.fps.toString(),
        '-video_size', preset.resolution,
        '-i', inputSource,
      ];
    } else {
      // 文件输入
      ffmpegArgs = [
        '-re',  // 实时速度读取
        '-stream_loop', '-1',  // 循环播放
        '-i', inputSource,
      ];
    }

    // 添加编码参数
    ffmpegArgs.push(
      // 视频编码
      '-c:v', 'libx264',
      '-preset', preset.preset,
      '-b:v', preset.videoBitrate,
      '-maxrate', preset.videoBitrate,
      '-bufsize', (parseInt(preset.videoBitrate) * 2).toString(),
      '-g', (preset.fps * 2).toString(),
      
      // 音频编码
      '-c:a', 'aac',
      '-b:a', preset.audioBitrate,
      '-ar', '44100',
      
      // 输出
      '-f', 'flv',
      rtmpUrl
    );

    console.log('[LivePublisher] 启动 FFmpeg:', ffmpegArgs.join(' '));

    // 启动 FFmpeg
    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    this.isLive = true;
    this.emit('started', { quality, rtmpUrl });

    // 监听输出
    this.ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      this.parseStats(output);
      this.emit('stats', this.stats);
    });

    // 监听错误
    this.ffmpegProcess.on('error', (err) => {
      console.error('[LivePublisher] 错误:', err);
      this.emit('error', { code: 'FFMPEG_ERROR', message: err.message });
      this.cleanup();
    });

    // 监听退出
    this.ffmpegProcess.on('close', (code) => {
      console.log('[LivePublisher] 进程退出，代码:', code);
      if (code !== 0 && this.isLive) {
        this.emit('error', { code: 'FFMPEG_EXIT', message: `异常退出: ${code}` });
      }
      this.cleanup();
    });
  }

  /**
   * 停止直播
   */
  stopLive() {
    if (!this.isLive) {
      return;
    }

    console.log('[LivePublisher] 停止直播');

    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGINT');
      
      // 3秒后强制杀死
      setTimeout(() => {
        if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
          this.ffmpegProcess.kill('SIGKILL');
        }
      }, 3000);
    }
  }

  /**
   * 解析 FFmpeg 统计信息
   */
  parseStats(output) {
    const fpsMatch = output.match(/fps=\s*([\d.]+)/);
    if (fpsMatch) {
      this.stats.fps = parseFloat(fpsMatch[1]);
    }

    const bitrateMatch = output.match(/bitrate=\s*([\d.]+)kbits\/s/);
    if (bitrateMatch) {
      this.stats.bitrate = parseFloat(bitrateMatch[1]);
    }

    const qualityMatch = output.match(/q=\s*([\d.]+)/);
    if (qualityMatch) {
      this.stats.quality = parseFloat(qualityMatch[1]);
    }

    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);
      this.stats.duration = hours * 3600 + minutes * 60 + seconds;
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.isLive = false;
    this.ffmpegProcess = null;
    this.stats = { fps: 0, bitrate: 0, quality: 0, duration: 0 };
    this.emit('stopped');
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      isLive: this.isLive,
      stats: this.stats
    };
  }
}

module.exports = LivePublisher;
