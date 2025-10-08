const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置multer用于文件上传
const uploadDir = path.join(__dirname, '../../media/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 限制500MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的视频格式
    const allowedTypes = /mp4|avi|mov|mkv|flv|wmv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只支持视频文件格式: mp4, avi, mov, mkv, flv, wmv, webm'));
    }
  }
});

/**
 * POST /api/upload
 * 上传视频文件
 */
router.post('/', upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件'
      });
    }

    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
    console.log('\n🎬 ========================================');
    console.log('📤 收到视频上传请求');
    console.log(`   - 文件名: ${req.file.originalname}`);
    console.log(`   - 文件大小: ${fileSizeMB} MB`);
    console.log(`   - 标题: ${req.body.title || req.file.originalname}`);
    console.log('========================================');

    const metadata = {
      title: req.body.title || req.file.originalname,
      description: req.body.description || ''
    };

    // 使用VideoManager处理视频
    const videoRecord = await req.videoManager.addVideo(req.file, metadata);

    console.log(`✅ 上传完成，视频ID: ${videoRecord.id}`);
    console.log(`⚡ 极速处理模式：预计 ${Math.ceil(fileSizeMB / 5)}-${Math.ceil(fileSizeMB / 3)} 秒`);
    console.log(`💡 使用直接复制模式，速度提升10-20倍！\n`);

    res.json({
      success: true,
      message: '视频上传成功，正在处理中...',
      data: videoRecord
    });
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    next(error);
  }
});

module.exports = router;

