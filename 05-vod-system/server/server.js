const express = require('express');
const cors = require('cors');
const path = require('path');
const VideoManager = require('./VideoManager');
const uploadRouter = require('./routes/upload');
const videoRouter = require('./routes/video');

const app = express();
const PORT = 3003;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// 静态文件服务 - 提供视频和HLS文件访问
app.use('/media', express.static(path.join(__dirname, '../media')));

// 初始化视频管理器
const videoManager = new VideoManager();

// 将videoManager传递给路由
app.use((req, res, next) => {
  req.videoManager = videoManager;
  next();
});

// API路由
app.use('/api/upload', uploadRouter);
app.use('/api/videos', videoRouter);

// 页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/player/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/player.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || '服务器内部错误' 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`VOD服务器运行在 http://localhost:${PORT}`);
  console.log(`视频列表页: http://localhost:${PORT}`);
  console.log('等待视频上传...');
});

